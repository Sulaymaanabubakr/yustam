import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../shared/models/listing_model.dart';
import '../../../core/services/listings_service.dart';
import '../../../core/services/auth_service.dart';

class CreateListingScreen extends ConsumerStatefulWidget {
  final String? listingId; // For editing existing listing

  const CreateListingScreen({
    super.key,
    this.listingId,
  });

  @override
  ConsumerState<CreateListingScreen> createState() => _CreateListingScreenState();
}

class _CreateListingScreenState extends ConsumerState<CreateListingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _locationController = TextEditingController();

  bool _isLoading = false;
  String? _selectedCategory;
  String? _selectedCondition = 'new';
  String? _selectedState;
  String? _selectedCity;
  List<String> _imageUrls = [];

  final List<String> _categories = [
    'Electronics',
    'Fashion',
    'Vehicles',
    'Real Estate',
    'Services',
    'Home & Garden',
    'Sports',
    'Books',
  ];

  final List<String> _nigerianStates = [
    'Lagos',
    'Abuja',
    'Kano',
    'Rivers',
    'Oyo',
    'Kaduna',
    'Enugu',
    'Delta',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.listingId != null) {
      _loadListing();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _loadListing() async {
    // TODO: Load existing listing for editing
  }

  Future<void> _pickImages() async {
    final ImagePicker picker = ImagePicker();
    final List<XFile> images = await picker.pickMultiImage();

    if (images.isNotEmpty) {
      // TODO: Upload images to Supabase storage
      // For now, just add placeholder URLs
      setState(() {
        _imageUrls.addAll(images.map((img) => img.path));
      });
    }
  }

  Future<void> _saveListing() async {
    if (!_formKey.currentState!.validate()) return;

    if (_imageUrls.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one image')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final currentUser = ref.read(currentUserProvider).value;
      if (currentUser == null) throw Exception('Not authenticated');

      final service = ref.read(listingsServiceProvider);

      if (widget.listingId == null) {
        // Create new listing
        await service.createListing(
          vendorId: currentUser.id,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          price: double.tryParse(_priceController.text),
          category: _selectedCategory,
          location: _locationController.text.trim(),
          city: _selectedCity,
          state: _selectedState,
          condition: _selectedCondition,
          images: _imageUrls,
        );
      } else {
        // Update existing listing
        await service.updateListing(
          listingId: widget.listingId!,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          price: double.tryParse(_priceController.text),
          category: _selectedCategory,
          location: _locationController.text.trim(),
          city: _selectedCity,
          state: _selectedState,
          condition: _selectedCondition,
          images: _imageUrls,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.listingId == null
                  ? 'Listing created successfully!'
                  : 'Listing updated successfully!',
            ),
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.listingId == null ? 'Create Listing' : 'Edit Listing'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Images Section
            Text(
              'Photos',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Add up to 5 photos',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),

            // Image Grid
            SizedBox(
              height: 120,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  // Add Image Button
                  InkWell(
                    onTap: _imageUrls.length < 5 ? _pickImages : null,
                    child: Container(
                      width: 120,
                      decoration: BoxDecoration(
                        color: AppTheme.gray100,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.gray300, width: 2, style: BorderStyle.solid),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.add_photo_alternate,
                            size: 32,
                            color: AppTheme.gray600,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Add Photo',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.gray600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Image Previews
                  ..._imageUrls.asMap().entries.map((entry) {
                    final index = entry.key;
                    final url = entry.value;
                    return Container(
                      width: 120,
                      margin: const EdgeInsets.only(left: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.gray200,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              url,
                              width: 120,
                              height: 120,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return const Center(
                                  child: Icon(Icons.image),
                                );
                              },
                            ),
                          ),
                          Positioned(
                            top: 4,
                            right: 4,
                            child: IconButton(
                              icon: const Icon(Icons.close, color: AppTheme.white),
                              style: IconButton.styleFrom(
                                backgroundColor: AppTheme.black.withOpacity(0.5),
                                padding: const EdgeInsets.all(4),
                              ),
                              onPressed: () {
                                setState(() {
                                  _imageUrls.removeAt(index);
                                });
                              },
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Title
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Title *',
                hintText: 'e.g. iPhone 13 Pro Max',
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a title';
                }
                return null;
              },
            ),

            const SizedBox(height: 16),

            // Description
            TextFormField(
              controller: _descriptionController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Description *',
                hintText: 'Describe your item...',
                alignLabelWithHint: true,
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a description';
                }
                return null;
              },
            ),

            const SizedBox(height: 16),

            // Category
            DropdownButtonFormField<String>(
              value: _selectedCategory,
              decoration: const InputDecoration(
                labelText: 'Category *',
              ),
              items: _categories.map((category) {
                return DropdownMenuItem(
                  value: category,
                  child: Text(category),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedCategory = value;
                });
              },
              validator: (value) {
                if (value == null) {
                  return 'Please select a category';
                }
                return null;
              },
            ),

            const SizedBox(height: 16),

            // Price
            TextFormField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Price (₦) *',
                hintText: '0.00',
                prefixText: '₦ ',
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a price';
                }
                if (double.tryParse(value) == null) {
                  return 'Please enter a valid number';
                }
                return null;
              },
            ),

            const SizedBox(height: 16),

            // Condition
            DropdownButtonFormField<String>(
              value: _selectedCondition,
              decoration: const InputDecoration(
                labelText: 'Condition *',
              ),
              items: const [
                DropdownMenuItem(value: 'new', child: Text('New')),
                DropdownMenuItem(value: 'used', child: Text('Used')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedCondition = value;
                });
              },
            ),

            const SizedBox(height: 16),

            // State
            DropdownButtonFormField<String>(
              value: _selectedState,
              decoration: const InputDecoration(
                labelText: 'State *',
              ),
              items: _nigerianStates.map((state) {
                return DropdownMenuItem(
                  value: state,
                  child: Text(state),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedState = value;
                });
              },
              validator: (value) {
                if (value == null) {
                  return 'Please select a state';
                }
                return null;
              },
            ),

            const SizedBox(height: 16),

            // City
            TextFormField(
              controller: TextEditingController(text: _selectedCity),
              decoration: const InputDecoration(
                labelText: 'City',
                hintText: 'e.g. Ikeja',
              ),
              onChanged: (value) {
                _selectedCity = value;
              },
            ),

            const SizedBox(height: 16),

            // Location
            TextFormField(
              controller: _locationController,
              decoration: const InputDecoration(
                labelText: 'Specific Location',
                hintText: 'e.g. Allen Avenue',
              ),
            ),

            const SizedBox(height: 32),

            // Submit Button
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _saveListing,
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(AppTheme.white),
                        ),
                      )
                    : Text(widget.listingId == null ? 'Create Listing' : 'Update Listing'),
              ),
            ),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
