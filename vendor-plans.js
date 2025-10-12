// ✅ Use the already-initialized Firebase instance
      import { auth, db } from './firebase.js';
      import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
      import { doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

      const loadingState = document.getElementById('loadingState');
      const plansContent = document.getElementById('plansContent');
      const backBtn = document.getElementById('backBtn');
      const logoutBtn = document.getElementById('logoutBtn');
      const plansGrid = document.getElementById('plansGrid');
      const toast = document.getElementById('toast');
      const upgradeModal = document.getElementById('upgradeModal');
      const modalTitle = document.getElementById('modalTitle');
      const modalDescription = document.getElementById('modalDescription');
      const cancelUpgradeBtn = document.getElementById('cancelUpgradeBtn');
      const confirmUpgradeBtn = document.getElementById('confirmUpgradeBtn');
      const currentPlanName = document.getElementById('currentPlanName');
      const currentPlanDescription = document.getElementById('currentPlanDescription');
      const currentPlanMeta = document.getElementById('currentPlanMeta');
      const planStatusChip = document.getElementById('planStatusChip');
      const currentPlanCard = document.getElementById('currentPlanCard');

      let vendorDocRef = null;
      let vendorData = null;
      let selectedPlan = null;

      const planDetails = {
        Free: {
          priceLabel: '₦0 / month',
          price: 0,
          description: 'Get started with essential tools to sell confidently on YUSTAM Marketplace.',
          meta: 'Unlimited access · No expiry set',
          status: 'Active',
        },
        Plus: {
          priceLabel: '₦3,000 / month',
          price: 3000,
          description: 'Level up with more listings, priority placement, and verified vendor credibility.',
          meta: 'Priority visibility · Monthly billing',
          status: 'Active',
        },
        Pro: {
          priceLabel: '₦5,000 / month',
          price: 5000,
          description: 'Expand your reach with analytics, homepage exposure, and premium support.',
          meta: 'Category highlights · Monthly billing',
          status: 'Active',
        },
        Premium: {
          priceLabel: '₦7,000 / month',
          price: 7000,
          description: 'Command the spotlight with unlimited listings, dedicated support, and deep insights.',
          meta: 'Maximum impact · Monthly billing',
          status: 'Active',
        },
      };

      const plans = [
        {
          name: 'Free',
          price: 0,
          buttonLabel: 'Activate Free Plan',
          buttonClass: 'btn-outline',
          features: [
            'Up to 2 active listings',
            'Basic vendor support',
            'Standard search placement',
            'No homepage feature',
          ],
        },
        {
          name: 'Plus',
          price: 3000,
          buttonLabel: 'Upgrade to Plus',
          buttonClass: 'btn-orange',
          features: [
            'Up to 10 active listings',
            'Priority listing placement',
            'Verified vendor badge',
            'Access to listing insights',
          ],
        },
        {
          name: 'Pro',
          price: 5000,
          buttonLabel: 'Upgrade to Pro',
          buttonClass: 'btn-emerald',
          features: [
            'Up to 25 active listings',
            'Homepage category exposure',
            'Vendor analytics dashboard',
            'Premium support response',
          ],
        },
        {
          name: 'Premium',
          price: 7000,
          buttonLabel: 'Upgrade to Premium',
          buttonClass: 'btn-gradient',
          features: [
            'Unlimited listings',
            'Homepage spotlight feature',
            'Dedicated account manager',
            'Advanced analytics & insights',
            'Featured vendor badge',
          ],
        },
      ];

      const planDescriptions = Object.fromEntries(
        Object.entries(planDetails).map(([plan, details]) => [plan, details.description])
      );

      const planMetaText = Object.fromEntries(
        Object.entries(planDetails).map(([plan, details]) => [plan, details.meta])
      );

      const planPriceLookup = Object.fromEntries(
        plans.map((plan) => [plan.name, plan.price])
      );

      const planPriceLabelLookup = Object.fromEntries(
        Object.entries(planDetails).map(([plan, details]) => [plan, details.priceLabel])
      );

      const showToast = (message) => {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
        }, 2600);
      };

      const toggleLoader = (show) => {
        if (show) {
          loadingState.classList.remove('hidden');
        } else {
          loadingState.classList.add('hidden');
        }
      };

      const toggleContent = (show) => {
        plansContent.hidden = !show;
      };

      const toggleModal = (open = false) => {
        if (open) {
          upgradeModal.classList.add('active');
          upgradeModal.setAttribute('aria-hidden', 'false');
        } else {
          upgradeModal.classList.remove('active');
          upgradeModal.setAttribute('aria-hidden', 'true');
        }
      };

      const payWithPaystack = async (planName) => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return { status: 'success', reference: `mock_${planName.toLowerCase()}_${Date.now()}` };
      };

      const buildFeatureList = (features) =>
        features
          .map(
            (feature) => `
              <li>
                <i class="ri-checkbox-circle-line" aria-hidden="true"></i>
                <span>${feature}</span>
              </li>
            `
          )
          .join('');

      const renderPlans = (activePlan = 'Free') => {
        plansGrid.innerHTML = '';
        plans.forEach((plan) => {
          const isCurrent = plan.name.toLowerCase() === (activePlan || 'Free').toLowerCase();
          const planCard = document.createElement('article');
          planCard.className = `plan-card ${isCurrent ? 'current' : ''}`.trim();
          planCard.setAttribute('role', 'listitem');
          planCard.dataset.plan = plan.name;
          planCard.innerHTML = `
            ${isCurrent ? '<span class="badge-current">Current Plan</span>' : ''}
            <h3>${plan.name}</h3>
            <p class="plan-price">${planPriceLabelLookup[plan.name]}</p>
            <ul class="plan-features">${buildFeatureList(plan.features)}</ul>
            <button
              class="btn ${plan.buttonClass}"
              data-plan="${plan.name}"
              data-amount="${plan.price}"
              ${isCurrent ? 'disabled' : ''}
            >
              ${isCurrent ? 'Current Plan' : plan.buttonLabel}
            </button>
          `;
          plansGrid.appendChild(planCard);
        });
      };

      const updateCurrentPlanSection = (plan = 'Free', status = 'Active', expiry = null) => {
        const normalizedPlan = planDetails[plan] ? plan : 'Free';
        currentPlanName.textContent = `${normalizedPlan} Plan`;
        currentPlanDescription.textContent = planDescriptions[normalizedPlan];
        currentPlanMeta.textContent = expiry
          ? `Renews on ${new Date(expiry).toLocaleDateString('en-NG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`
          : planMetaText[normalizedPlan];

        const isExpired = (status || '').toLowerCase() === 'expired';
        planStatusChip.textContent = `${isExpired ? 'Expired' : 'Active'} Plan`;
        planStatusChip.classList.toggle('expired', isExpired);
        planStatusChip.innerHTML = `
          <i class="${isExpired ? 'ri-alarm-warning-line' : 'ri-shield-check-line'}" aria-hidden="true"></i>
          ${isExpired ? 'Expired Plan' : 'Active Plan'}
        `;

        currentPlanCard.dataset.plan = normalizedPlan;
      };

      const prepareUpgradeModal = (planName) => {
        const amountLabel = planPriceLabelLookup[planName] || '';
        modalTitle.textContent = 'Confirm Upgrade';
        modalDescription.textContent = `You're about to upgrade to the ${planName} plan for ${amountLabel}.`;
        confirmUpgradeBtn.textContent = `Proceed · ${amountLabel}`;
      };

      const attachPlanListeners = () => {
        plansGrid.querySelectorAll('button[data-plan]').forEach((button) => {
          button.addEventListener('click', () => {
            const planName = button.dataset.plan;
            selectedPlan = planName;
            prepareUpgradeModal(planName);
            toggleModal(true);
          });
        });
      };

      const refreshUI = (data) => {
        const plan = data?.planType || 'Free';
        const status = data?.planStatus || 'Active';
        const expiry = data?.planExpiry || null;
        updateCurrentPlanSection(plan, status, expiry);
        renderPlans(plan);
        attachPlanListeners();
      };

      backBtn.addEventListener('click', () => {
        window.location.href = 'vendor-dashboard.html';
      });

      logoutBtn.addEventListener('click', async () => {
        try {
          await signOut(auth);
          window.location.href = 'vendor-login.html';
        } catch (error) {
          console.error('Logout failed', error);
          showToast('Unable to logout. Try again.');
        }
      });

      cancelUpgradeBtn.addEventListener('click', () => {
        toggleModal(false);
        selectedPlan = null;
      });

      upgradeModal.addEventListener('click', (event) => {
        if (event.target === upgradeModal) {
          toggleModal(false);
          selectedPlan = null;
        }
      });

      confirmUpgradeBtn.addEventListener('click', async () => {
        if (!selectedPlan || !vendorDocRef) return;
        confirmUpgradeBtn.disabled = true;
        confirmUpgradeBtn.innerHTML = '<i class="ri-loader-4-line" aria-hidden="true"></i> Processing...';

        try {
          const response = await payWithPaystack(selectedPlan);
          if (response.status === 'success') {
            await updateDoc(vendorDocRef, {
              planType: selectedPlan,
              planStatus: 'Active',
              planUpdatedAt: new Date().toISOString(),
            });
            vendorData = { ...vendorData, planType: selectedPlan, planStatus: 'Active' };
            refreshUI(vendorData);
            showToast(`You have successfully upgraded to the ${selectedPlan} plan!`);
          } else {
            showToast('Upgrade was not completed.');
          }
        } catch (error) {
          console.error('Upgrade error', error);
          showToast('Unable to process upgrade.');
        } finally {
          confirmUpgradeBtn.disabled = false;
          confirmUpgradeBtn.innerHTML = 'Proceed';
          toggleModal(false);
          selectedPlan = null;
        }
      });

      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          window.location.href = 'vendor-login.html';
          return;
        }

        toggleLoader(true);
        toggleContent(false);

        try {
          vendorDocRef = doc(db, 'vendors', user.uid);
          const snapshot = await getDoc(vendorDocRef);

          if (!snapshot.exists()) {
            const defaultData = {
              vendorName: user.displayName || '',
              email: user.email || '',
              planType: 'Free',
              planStatus: 'Active',
              createdAt: new Date().toISOString(),
            };
            await setDoc(vendorDocRef, defaultData, { merge: true });
            vendorData = defaultData;
          } else {
            vendorData = snapshot.data();
          }

          refreshUI(vendorData);
          toggleContent(true);
        } catch (error) {
          console.error('Error loading vendor plan', error);
          showToast('Unable to load plans. Please try again.');
        } finally {
          toggleLoader(false);
        }
      });
