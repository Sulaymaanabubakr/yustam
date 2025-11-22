import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import { goBackOrNavigate } from '../../utils/navigation';
import { chatAPI } from '../../services/api';
import { subscribeMessages } from '../../services/chatSync';
import { sendMessageToFirestore, markChatAsReadInFirestore } from '../../services/chatFirestore';
import { timeAgo } from '../../utils/formatters';
import resolveMediaUrl from '../../utils/url';
import { USER_ROLES } from '../../config/constants';
import { resolveUserUid } from '../../utils/user';
import { uploadImage, uploadAudio } from '../../config/cloudinary';

const ensureIsoTimestamp = (value) => {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const formatVoiceDuration = (inputSeconds) => {
  const seconds = Number.isFinite(inputSeconds) ? Math.max(0, Math.round(inputSeconds)) : 0;
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

const ChatThreadScreen = ({ navigation, route }) => {
  const {
    chatId,
    buyerName = 'Buyer',
    buyerPhoto,
    buyerId = '',
    vendorName,
    vendorPhoto,
    vendorPlanLabel,
    listingTitle = '',
    listingId = '',
    listingImage = '',
    vendorUid = '',
  } = route.params || {};
  const { user, role } = useAuth();
  const resolvedUid = resolveUserUid(user, role === USER_ROLES.VENDOR ? 'vendor' : 'buyer');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [attachment, setAttachment] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceSending, setVoiceSending] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const listRef = useRef(null);
  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingStartedAtRef = useRef(0);
  const playbackRef = useRef(null);
  const viewingAsVendor = role === USER_ROLES.VENDOR;
  const peerName = viewingAsVendor ? buyerName || 'Buyer' : vendorName || 'Marketplace Vendor';
  const peerSubtitle = viewingAsVendor
    ? buyerId ? `Buyer ID: ${buyerId}` : 'Buyer'
    : listingTitle || vendorPlanLabel || 'Vendor';
  const peerAvatar = viewingAsVendor ? resolveMediaUrl(buyerPhoto) : resolveMediaUrl(vendorPhoto);
  const viewerDisplayName = viewingAsVendor
    ? user?.businessName || user?.displayName || user?.fullName || user?.name || 'Vendor'
    : user?.fullName || user?.displayName || user?.email || 'Buyer';
  const buyerUidResolved = (viewingAsVendor ? buyerId : resolvedUid) || '';
  const vendorUidResolved = (viewingAsVendor ? resolvedUid : vendorUid) || '';
  const buyerDisplayName = viewingAsVendor ? buyerName || 'Buyer' : viewerDisplayName;
  const vendorDisplayName = viewingAsVendor ? viewerDisplayName : vendorName || 'Marketplace Vendor';
  const listingMeta = {
    id: listingId || '',
    title: listingTitle || '',
    image: resolveMediaUrl(listingImage) || '',
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const requestGalleryPermission = async () => {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!result.granted) {
      showToast('Please allow photo permissions to send images.', 'error');
      return false;
    }
    return true;
  };

  const handleAttachmentPress = async () => {
    if (uploadingAttachment || sending || voiceSending) {
      return;
    }
    try {
      const allowed = await requestGalleryPermission();
      if (!allowed) {
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.85,
      });
      if (pickerResult.canceled || !pickerResult.assets?.length) {
        return;
      }
      const asset = pickerResult.assets[0];
      setAttachment({
        uri: asset.uri,
        name: asset.fileName || `chat-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        width: asset.width,
        height: asset.height,
      });
    } catch (error) {
      console.error('Attachment picker failed:', error);
      showToast('Unable to open your gallery right now.', 'error');
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
  };

  const stopVoicePlayback = async () => {
    if (!playbackRef.current) {
      return;
    }
    try {
      await playbackRef.current.stopAsync();
    } catch (error) {
      // ignore stop errors
    }
    try {
      await playbackRef.current.unloadAsync();
    } catch (error) {
      // ignore unload errors
    }
    playbackRef.current = null;
    setPlayingVoiceId(null);
  };

  const handleToggleVoicePlayback = async (message) => {
    if (!message?.voice) {
      return;
    }
    try {
      if (playingVoiceId === message.id) {
        await stopVoicePlayback();
        return;
      }
      await stopVoicePlayback();
      const { sound } = await Audio.Sound.createAsync({ uri: message.voice });
      playbackRef.current = sound;
      setPlayingVoiceId(message.id);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish || status.isLoaded === false) {
          stopVoicePlayback().catch(() => {});
        }
      });
      await sound.playAsync();
    } catch (error) {
      console.error('Voice playback failed:', error);
      showToast('Unable to play the voice note.', 'error');
      await stopVoicePlayback();
    }
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const resetRecordingState = async () => {
    clearRecordingTimer();
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        // ignore
      }
      recordingRef.current = null;
    }
    recordingStartedAtRef.current = 0;
    setRecordingStatus('idle');
    setRecordingDuration(0);
  };

  const startVoiceRecording = async () => {
    if (recordingStatus === 'recording' || voiceSending) {
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        showToast('Microphone access is required to send voice notes.', 'error');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      recordingStartedAtRef.current = Date.now();
      setRecordingStatus('recording');
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - recordingStartedAtRef.current;
        setRecordingDuration(elapsed);
      }, 200);
    } catch (error) {
      console.error('Unable to start voice recording:', error);
      showToast('Voice recording failed to start.', 'error');
      await resetRecordingState();
    }
  };

  const sendVoiceRecording = async () => {
    if (!recordingRef.current || recordingStatus !== 'recording' || voiceSending) {
      return;
    }
    if (!buyerUidResolved || !vendorUidResolved) {
      showToast('Chat participants missing. Please reload the conversation.', 'error');
      return;
    }
    setRecordingStatus('uploading');
    clearRecordingTimer();
    let tempId = `voice-${Date.now()}`;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const status = await recordingRef.current.getStatusAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) {
        throw new Error('Recording missing audio data.');
      }
      const durationSeconds = status?.durationMillis
        ? status.durationMillis / 1000
        : Math.max(recordingDuration / 1000, 0.5);
      const optimisticMessage = {
        id: tempId,
        text: 'Voice note',
        type: 'voice',
        timestamp: new Date().toISOString(),
        isMine: true,
        status: 'sending',
        voice: uri,
        duration: durationSeconds,
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setVoiceSending(true);
      const upload = await uploadAudio(uri, {
        folder: 'yustam/chats/voice',
        fileName: `voice-${Date.now()}.m4a`,
        mimeType: 'audio/m4a',
      });
      await sendMessageToFirestore({
        chatId,
        senderUid: resolvedUid,
        senderRole: viewingAsVendor ? 'vendor' : 'buyer',
        text: '',
        imageUrl: '',
        voiceUrl: upload.url,
        duration: durationSeconds,
        buyerUid: buyerUidResolved,
        vendorUid: vendorUidResolved,
        buyerName: buyerDisplayName,
        vendorName: vendorDisplayName,
        listingId: listingMeta.id,
        listingTitle: listingMeta.title,
        listingImage: listingMeta.image,
      });
      // Message will appear via real-time listener
      showToast('Voice note sent.');
    } catch (error) {
      console.error('Voice message failed:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      showToast(error.message || 'Unable to send voice note.', 'error');
    } finally {
      await resetRecordingState();
      setVoiceSending(false);
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch (audioError) {
        console.warn('Failed to reset audio mode', audioError);
      }
    }
  };

  const cancelVoiceRecording = async () => {
    if (recordingStatus !== 'recording') {
      return;
    }
    await resetRecordingState();
    showToast('Recording cancelled.', 'info');
  };

  const mapMessage = useCallback(
    (message) => {
      if (!message) {
        return null;
      }

      const senderRoleRaw = String(message.sender_role || message.role || message.author || '')
        .toLowerCase()
        .trim();
      const senderUid = String(message.sender_uid || message.uid || '').trim();
      const viewerUid = (resolvedUid || '').toString();

      const senderRole = senderRoleRaw.includes('vendor')
        ? USER_ROLES.VENDOR
        : senderRoleRaw.includes('buyer')
        ? USER_ROLES.BUYER
        : null;

      const inferredMine = senderRole
        ? senderRole === (viewingAsVendor ? USER_ROLES.VENDOR : USER_ROLES.BUYER)
        : viewingAsVendor
        ? !senderRoleRaw.includes('buyer')
        : senderRoleRaw.includes('buyer');

      const isMine =
        Boolean(message.isMine) ||
        (viewerUid && senderUid && viewerUid === senderUid) ||
        (!viewerUid && inferredMine);

      const attachmentUrl = resolveMediaUrl(
        message.attachment || message.image || message.image_url || message.imageUrl
      );
      const voiceSource = resolveMediaUrl(message.voice_url || message.voiceUrl || '');
      const baseType = String(message.type || message.message_type || '').toLowerCase();
      const type = baseType || (voiceSource ? 'voice' : attachmentUrl ? 'image' : 'text');
      const textRaw = message.text || message.message || message.body || '';
      const text = textRaw || (type === 'image' ? 'Photo' : type === 'voice' ? 'Voice note' : '');
      const durationSeconds = Number(
        message.duration || message.voice_duration || message.voiceDuration || 0
      );

      return {
        id: message.id || message.message_id || message.clientId || `${Date.now()}-${Math.random()}`,
        text,
        type,
        timestamp: ensureIsoTimestamp(
          message.timestamp || message.created_at || message.sent_at || new Date().toISOString()
        ),
        isMine,
        status: message.status || 'sent',
        attachment: attachmentUrl,
        voice: type === 'voice' ? voiceSource : null,
        duration: Number.isFinite(durationSeconds) ? durationSeconds : 0,
      };
    },
    [resolvedUid, viewingAsVendor]
  );

  const handleMessagesUpdate = useCallback(
    (records = []) => {
      const nextMessages = records
        .map(mapMessage)
        .filter(Boolean)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setMessages(nextMessages);
      setLoading(false);
      setRefreshing(false);
    },
    [mapMessage]
  );

  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      setMessages([]);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeMessages(
      chatId,
      (records = []) => {
        handleMessagesUpdate(Array.isArray(records) ? records : []);
      },
      {
        onError: (error) => {
          console.error('Realtime messages failed:', error);
          showToast('Realtime updates unavailable. Please check your connection.', 'error');
        },
        onStatus: (status) => {
          console.log('Chat subscription status:', status);
        },
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, [chatId, handleMessagesUpdate]);

  useFocusEffect(
    useCallback(() => {
      if (!chatId) {
        return undefined;
      }
      markChatAsReadInFirestore(chatId, viewingAsVendor ? 'vendor' : 'buyer').catch((error) => {
        console.warn('Failed to mark chat as read:', error);
      });
      return undefined;
    }, [chatId, viewingAsVendor])
  );

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    const attachmentPayload = attachment;
    const hasAttachment = Boolean(attachmentPayload);
    if ((trimmed === '' && !hasAttachment) || sending || uploadingAttachment || voiceSending || !chatId) {
      return;
    }
    if (!buyerUidResolved || !vendorUidResolved) {
      showToast('Chat participants missing. Please reload the conversation.', 'error');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text: trimmed || (hasAttachment ? 'Photo' : ''),
      type: hasAttachment ? 'image' : 'text',
      timestamp: new Date().toISOString(),
      isMine: true,
      status: 'sending',
      attachment: hasAttachment ? attachmentPayload.uri : null,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputValue('');
    setSending(true);

    try {
      let uploadedImageUrl = '';
      if (hasAttachment && attachmentPayload) {
        setUploadingAttachment(true);
        const uploadResult = await uploadImage(attachmentPayload.uri, {
          folder: 'yustam/chats/images',
          fileName: attachmentPayload.name || `chat-${Date.now()}.jpg`,
          mimeType: attachmentPayload.mimeType || 'image/jpeg',
        });
        uploadedImageUrl = uploadResult.url;
      }

      await sendMessageToFirestore({
        chatId,
        senderUid: resolvedUid,
        senderRole: viewingAsVendor ? 'vendor' : 'buyer',
        text: trimmed,
        imageUrl: uploadedImageUrl,
        voiceUrl: '',
        buyerUid: buyerUidResolved,
        vendorUid: vendorUidResolved,
        buyerName: buyerDisplayName,
        vendorName: vendorDisplayName,
        listingId: listingMeta.id,
        listingTitle: listingMeta.title,
        listingImage: listingMeta.image,
      });
      if (hasAttachment) {
        clearAttachment();
      }
      // Message will appear via real-time listener
    } catch (error) {
      console.error('Send message failed:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      showToast(error.message || 'Unable to send message. Please try again.', 'error');
    } finally {
      setUploadingAttachment(false);
      setSending(false);
    }
  };

  const onRefresh = useCallback(() => {
    // Firestore listener handles updates automatically
    // Just clear the refreshing state
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!messages.length) {
      return;
    }
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  useEffect(() => {
    if (!chatId || !messages.length) {
      return;
    }
    chatAPI.markAsRead(chatId, viewingAsVendor ? 'vendor' : 'buyer').catch(() => {});
  }, [chatId, messages, viewingAsVendor]);

  useEffect(() => () => {
    clearRecordingTimer();
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    if (playbackRef.current) {
      playbackRef.current.stopAsync().catch(() => {});
      playbackRef.current.unloadAsync().catch(() => {});
      playbackRef.current = null;
    }
  }, []);

  const renderMessage = ({ item }) => {
    const showTimestamp = !!item.timestamp;
    const hasText = Boolean(item.text);
    const hasImage = Boolean(item.attachment);
    const hasVoice = item.type === 'voice' && Boolean(item.voice);
    const timestampLabel = showTimestamp ? timeAgo(item.timestamp) : '';
    const voiceDurationLabel = hasVoice ? formatVoiceDuration(item.duration || 0) : '';

    return (
      <View style={[styles.messageRow, item.isMine ? styles.myRow : styles.theirRow]}>
        <View style={[styles.messageBubble, item.isMine ? styles.myBubble : styles.theirBubble]}>
          {hasImage && <Image source={{ uri: item.attachment }} style={styles.messageImage} />}
          {hasVoice && (
            <TouchableOpacity
              style={styles.voiceBubble}
              onPress={() => handleToggleVoicePlayback(item)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.voicePlayButton,
                  playingVoiceId === item.id && styles.voicePlayButtonActive,
                ]}
              >
                <Ionicons
                  name={playingVoiceId === item.id ? 'pause' : 'play'}
                  size={18}
                  color={item.isMine ? theme.colors.primary : theme.colors.textPrimary}
                />
              </View>
              <Text style={styles.voiceDuration}>{voiceDurationLabel || '00:00'}</Text>
            </TouchableOpacity>
          )}
          {hasText && (
            <Text style={[styles.messageText, item.isMine && styles.myMessageText]}>{item.text}</Text>
          )}
          {showTimestamp && (
            <Text style={[styles.timestamp, item.isMine && styles.myTimestamp]}>
              {timestampLabel}
              {item.status === 'sending' && ' - Sending'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => goBackOrNavigate(navigation)} style={styles.headerButton}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        {peerAvatar ? (
          <Image source={{ uri: peerAvatar }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Ionicons name="person" size={20} color={theme.colors.white} />
          </View>
        )}
        <View>
          <Text style={styles.headerTitle}>{peerName}</Text>
          <Text style={styles.headerSubtitle}>{peerSubtitle}</Text>
        </View>
      </View>
      <View style={styles.headerButton}>
        <Ionicons
          name={viewingAsVendor ? 'call-outline' : 'shield-checkmark-outline'}
          size={22}
          color={theme.colors.primary}
        />
      </View>
    </View>
  );

  const composerHasContent = Boolean(attachment || inputValue.trim());
  const sendDisabled = !composerHasContent || sending || uploadingAttachment || voiceSending;
  const recordingTimerLabel = formatVoiceDuration(Math.floor(recordingDuration / 1000));
  const isRecording = recordingStatus === 'recording';

  if (!chatId) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Missing conversation details.</Text>
          <Button onPress={() => goBackOrNavigate(navigation)} variant="outline">
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      <Header />

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContainer}
            refreshControl={(
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            )}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.composer}>
            {attachment && (
              <View style={styles.attachmentPreview}>
                <Image source={{ uri: attachment.uri }} style={styles.attachmentPreviewImage} />
                <View style={styles.attachmentMeta}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {attachment.name || 'Photo attachment'}
                  </Text>
                  <Text style={styles.attachmentStatus}>
                    {uploadingAttachment ? 'Uploading…' : 'Ready to send'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.attachmentRemove} onPress={clearAttachment}>
                  <Ionicons name="close" size={16} color={theme.colors.white} />
                </TouchableOpacity>
              </View>
            )}

            {isRecording && (
              <View style={styles.recordingBanner}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording {recordingTimerLabel}</Text>
                <TouchableOpacity onPress={cancelVoiceRecording}>
                  <Text style={styles.recordingCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.composerRow}>
              <TouchableOpacity
                style={[
                  styles.composerButton,
                  (sending || uploadingAttachment || voiceSending) && styles.composerButtonDisabled,
                ]}
                onPress={handleAttachmentPress}
                disabled={sending || uploadingAttachment || voiceSending}
              >
                <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Write a message..."
                placeholderTextColor={theme.colors.textSecondary}
                value={inputValue}
                onChangeText={setInputValue}
                editable={!voiceSending}
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.composerButton,
                  styles.voiceButton,
                  isRecording && styles.voiceButtonActive,
                  voiceSending && styles.composerButtonDisabled,
                ]}
                onPress={isRecording ? sendVoiceRecording : startVoiceRecording}
                disabled={voiceSending}
              >
                {voiceSending ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Ionicons
                    name={isRecording ? 'stop-circle' : 'mic-outline'}
                    size={20}
                    color={theme.colors.primary}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.composerButton, styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={sendDisabled}
              >
                {sending || uploadingAttachment ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Ionicons name="send" size={20} color={theme.colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}10`,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  keyboardAvoider: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  messageRow: {
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  theirRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  myBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: theme.colors.backgroundLight,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  myMessageText: {
    color: theme.colors.white,
  },
  timestamp: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing.xs / 2,
    color: theme.colors.textTertiary,
  },
  myTimestamp: {
    color: theme.colors.textLight,
  },
  composer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    gap: theme.spacing.sm,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  composerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}10`,
  },
  composerButtonDisabled: {
    opacity: 0.5,
  },
  voiceButton: {
    borderColor: `${theme.colors.primary}50`,
    borderWidth: 1,
  },
  voiceButtonActive: {
    backgroundColor: `${theme.colors.error || '#dc412f'}20`,
    borderColor: theme.colors.error || '#dc412f',
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.base,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    textAlign: 'center',
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: `${theme.colors.primary}10`,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  attachmentPreviewImage: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  attachmentMeta: {
    flex: 1,
  },
  attachmentName: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  attachmentStatus: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  attachmentRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error || '#dc412f',
  },
  recordingText: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    color: theme.colors.error || '#dc412f',
  },
  recordingCancel: {
    fontFamily: theme.typography.fontFamily.inter,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  voicePlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}60`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayButtonActive: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  voiceDuration: {
    fontFamily: theme.typography.fontFamily.inter,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});

export default ChatThreadScreen;
