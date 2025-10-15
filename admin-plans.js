import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
    import { getAuth, onAuthStateChanged, signOut, getIdTokenResult } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
    import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, query } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
    import { app as firebaseApp, auth as firebaseAuth, db as firebaseDb } from './firebase.js';

    const app = firebaseApp || initializeApp({});
    const auth = firebaseAuth || getAuth(app);
    const db = firebaseDb || getFirestore(app);

    const loader = document.getElementById('authLoader');
    const logoutBtn = document.getElementById('logoutBtn');
    const backToDashboard = document.getElementById('backToDashboard');
    const planMetricCards = document.getElementById('planMetricCards');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalVendorsEl = document.getElementById('totalVendors');
    const annualRevenueEl = document.getElementById('annualRevenue');
    const avgRevenueEl = document.getElementById('avgRevenue');
    const vendorTableBody = document.getElementById('vendorTableBody');
    const tableControls = document.getElementById('tableControls');
    const toastEl = document.getElementById('toast');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const planModalBackdrop = document.getElementById('planModalBackdrop');
    const planModalVendor = document.getElementById('planModalVendor');
    const newPlanSelect = document.getElementById('newPlanSelect');
    const cancelPlanChange = document.getElementById('cancelPlanChange');
    const confirmPlanChange = document.getElementById('confirmPlanChange');

    const ensureSession = async () => {
      try {
        const response = await fetch('admin-session-status.php', {
          method: 'GET',
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Session invalid');
        return await response.json();
      } catch (error) {
        console.error('Admin session validation failed:', error);
        window.location.href = 'admin-login.php';
        return null;
      }
    };

    let activeFilters = { search:'', plan:'all' };
    let vendorData = [];
    let selectedVendor = null;
    let planChart = null;

    const planMeta = {
      free: { label:'Free', price:0, className:'plan-free', badge:'free' },
      plus: { label:'Plus', price:3000, className:'plan-plus', badge:'plus' },
      pro: { label:'Pro', price:5000, className:'plan-pro', badge:'pro' },
      premium: { label:'Premium', price:7000, className:'plan-premium', badge:'premium' }
    };

    // Utility
    const currency = new Intl.NumberFormat('en-NG', { style:'currency', currency:'NGN', maximumFractionDigits:0 });

    function showToast(message, success=true){
      toastEl.textContent = message;
      toastEl.style.background = success ? 'linear-gradient(135deg,#00695C,#00A28A)' : 'linear-gradient(135deg,#D84315,#F3731E)';
      toastEl.classList.add('show');
      setTimeout(()=>toastEl.classList.remove('show'), 2600);
    }

    function closeModal(){
      planModalBackdrop.classList.remove('active');
      selectedVendor = null;
    }

    cancelPlanChange.addEventListener('click', closeModal);
    planModalBackdrop.addEventListener('click', (e)=>{
      if(e.target === planModalBackdrop) closeModal();
    });

    backToDashboard.addEventListener('click', ()=>{ window.location.href = 'admin-dashboard.php'; });
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        await fetch('admin-logout.php', { method: 'GET', credentials: 'same-origin' });
      } catch (error) {
        console.error('logout error', error);
      } finally {
        window.location.href = 'admin-login.php';
      }
    });

    exportCsvBtn.addEventListener('click', ()=>{
      if(!vendorData.length){
        showToast('No vendor data to export', false);
        return;
      }
      const rows = [['Vendor Name','Email','Phone','Plan','Start Date','Expiry Date']];
      vendorData.forEach(v=>{
        rows.push([
          `${v.displayName || v.businessName || 'Unnamed Vendor'}`,
          v.email || '',
          v.phone || '',
          (planMeta[v.plan]?.label) || 'Free',
          v.planStartDate ? new Date(v.planStartDate.seconds*1000).toLocaleDateString() : '-',
          v.planExpiryDate ? new Date(v.planExpiryDate.seconds*1000).toLocaleDateString() : '-'
        ]);
      });
      const csv = rows.map(r=>r.map(value=>`"${(value ?? '').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yustam-vendor-plans-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported successfully');
    });

    function renderControls(){
      tableControls.innerHTML = '';
      const searchInput = document.createElement('input');
      searchInput.type = 'search';
      searchInput.placeholder = 'Search by name or email…';
      searchInput.value = activeFilters.search;
      searchInput.addEventListener('input', (e)=>{
        activeFilters.search = e.target.value.toLowerCase();
        renderTable();
      });

      const planSelect = document.createElement('select');
      planSelect.innerHTML = `
        <option value="all">All Plans</option>
        <option value="free">Free</option>
        <option value="plus">Plus</option>
        <option value="pro">Pro</option>
        <option value="premium">Premium</option>
      `;
      planSelect.value = activeFilters.plan;
      planSelect.addEventListener('change',(e)=>{
        activeFilters.plan = e.target.value;
        renderTable();
      });

      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'refresh-btn';
      refreshBtn.innerHTML = '<i class="ri-refresh-line"></i> Refresh';
      refreshBtn.type = 'button';
      refreshBtn.addEventListener('click', loadPlanData);

      tableControls.append(searchInput, planSelect, refreshBtn);
    }

    function renderMetricCards(counts){
      planMetricCards.innerHTML = '';
      Object.entries(planMeta).forEach(([key, meta])=>{
        const count = counts[key] || 0;
        const revenue = meta.price * count;
        const card = document.createElement('article');
        card.className = `glass-card ${meta.className}`;
        card.innerHTML = `
          <span class="plan-badge ${meta.badge}">${meta.label} Plan</span>
          <h3>${meta.label}</h3>
          <p class="metric-value">${count}</p>
          <p class="metric-sub">Monthly Revenue: <strong>${currency.format(revenue)}</strong></p>
        `;
        card.addEventListener('click', ()=>{
          activeFilters.plan = key;
          renderControls();
          renderTable();
        });
        planMetricCards.appendChild(card);
      });
    }

    function renderTable(){
      const filtered = vendorData.filter(v=>{
        const searchMatch = !activeFilters.search || `${v.displayName || ''} ${v.businessName || ''} ${v.email || ''}`.toLowerCase().includes(activeFilters.search);
        const planMatch = activeFilters.plan === 'all' || v.plan === activeFilters.plan;
        return searchMatch && planMatch;
      });
      vendorTableBody.innerHTML = '';
      if(!filtered.length){
        const emptyRow = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.style.textAlign = 'center';
        td.style.padding = '28px';
        td.textContent = 'No vendors found for the selected filters.';
        emptyRow.appendChild(td);
        vendorTableBody.appendChild(emptyRow);
        return;
      }
      filtered.forEach(v=>{
        const tr = document.createElement('tr');
        const planChipClass = `plan-chip ${v.plan === 'plus' ? 'chip-plus' : v.plan === 'pro' ? 'chip-pro' : v.plan === 'premium' ? 'chip-premium' : 'chip-free'}`;
        tr.innerHTML = `
          <td>${v.displayName || v.businessName || 'Unnamed Vendor'}</td>
          <td>${v.email || '-'}</td>
          <td>${v.phone || '-'}</td>
          <td><span class="${planChipClass}">${planMeta[v.plan]?.label || 'Free'}</span></td>
          <td>${v.planStartDate ? new Date(v.planStartDate.seconds*1000).toLocaleDateString() : '-'}</td>
          <td>${v.planExpiryDate ? new Date(v.planExpiryDate.seconds*1000).toLocaleDateString() : '-'}</td>
          <td>
            <div class="actions">
              <button class="btn btn-outline" data-action="change" data-id="${v.id}"><i class="ri-repeat-line"></i> Change</button>
              <button class="btn btn-emerald" data-action="view" data-id="${v.id}"><i class="ri-user-3-line"></i> Profile</button>
            </div>
          </td>
        `;
        vendorTableBody.appendChild(tr);
      });
    }

    function updateRevenue(counts){
      const plusCount = counts.plus || 0;
      const proCount = counts.pro || 0;
      const premiumCount = counts.premium || 0;
      const totalVendors = Object.values(counts).reduce((acc,val)=>acc + val,0);
      const totalRevenue = (plusCount*3000) + (proCount*5000) + (premiumCount*7000);
      const annualRevenue = totalRevenue * 12;
      const avgRevenue = totalVendors ? totalRevenue/Math.max(totalVendors,1) : 0;

      totalRevenueEl.textContent = currency.format(totalRevenue);
      totalVendorsEl.textContent = totalVendors.toString();
      annualRevenueEl.textContent = currency.format(annualRevenue);
      avgRevenueEl.textContent = currency.format(avgRevenue);
    }

    function renderChart(counts){
      const ctx = document.getElementById('planChart').getContext('2d');
      const data = [counts.free || 0, counts.plus || 0, counts.pro || 0, counts.premium || 0];
      const labels = ['Free','Plus','Pro','Premium'];
      if(planChart){
        planChart.data.datasets[0].data = data;
        planChart.update();
      } else {
        planChart = new window.Chart(ctx, {
          type:'doughnut',
          data:{
            labels,
            datasets:[{
              data,
              backgroundColor:[
                'rgba(17,17,17,0.2)',
                'rgba(243,115,30,0.8)',
                'rgba(0,105,92,0.8)',
                'rgba(243,115,30,1)'
              ],
              borderWidth:1,
              hoverOffset:8
            }]
          },
          options:{
            cutout:'65%',
            plugins:{legend:{display:false}},
            responsive:true,
            animation:{animateScale:true}
          }
        });
      }
      const legend = document.getElementById('chartLegend');
      legend.innerHTML = '';
      labels.forEach((label, index)=>{
        const item = document.createElement('span');
        item.className = 'legend-item';
        item.innerHTML = `<span class="legend-dot" style="background:${planChart.data.datasets[0].backgroundColor[index]}"></span>${label}`;
        legend.appendChild(item);
      });
    }

    async function openChangePlanModal(vendor){
      selectedVendor = vendor;
      planModalVendor.textContent = vendor.displayName || vendor.businessName || vendor.email || 'Vendor';
      newPlanSelect.value = vendor.plan || 'free';
      planModalBackdrop.classList.add('active');
      planModalBackdrop.setAttribute('aria-hidden','false');
    }

    confirmPlanChange.addEventListener('click', async ()=>{
      if(!selectedVendor) return;
      const newPlan = newPlanSelect.value;
      if(newPlan === selectedVendor.plan){
        showToast('Vendor already on this plan', false);
        return;
      }
      try {
        const vendorRef = doc(db, 'vendors', selectedVendor.id);
        await updateDoc(vendorRef, {
          plan:newPlan,
          planUpdatedAt:serverTimestamp(),
          planUpdatedBy:auth.currentUser?.uid || null
        });
        await addDoc(collection(db,'plans'), {
          vendorId:selectedVendor.id,
          oldPlan:selectedVendor.plan || 'free',
          newPlan,
          updatedBy:auth.currentUser?.uid || null,
          updatedAt:serverTimestamp()
        });
        showToast('Vendor plan updated');
        closeModal();
      } catch(err){
        console.error(err);
        showToast('Failed to update plan', false);
      }
    });

    vendorTableBody.addEventListener('click', (event)=>{
      const target = event.target.closest('button');
      if(!target) return;
      const id = target.dataset.id;
      const action = target.dataset.action;
      const vendor = vendorData.find(v=>v.id === id);
      if(!vendor) return;
      if(action === 'change'){
        openChangePlanModal(vendor);
      } else if(action === 'view'){
        const storefrontUrl = `vendor-storefront.php?vendorId=${encodeURIComponent(id)}`;
        const storefrontWindow = window.open(storefrontUrl, '_blank', 'noopener');
        if(storefrontWindow){
          storefrontWindow.opener = null;
        } else {
          window.location.href = storefrontUrl;
        }
      }
    });

    async function loadPlanData(){
      try {
        const vendorsCol = collection(db,'vendors');
        const q = query(vendorsCol);
        const snapshot = await getDocs(q);
        vendorData = snapshot.docs.map(docSnap=>({ id:docSnap.id, ...docSnap.data() }));
        const counts = vendorData.reduce((acc,v)=>{
          const plan = (v.plan || 'free').toLowerCase();
          acc[plan] = (acc[plan] || 0) + 1;
          return acc;
        }, { free:0, plus:0, pro:0, premium:0 });

        renderMetricCards(counts);
        renderControls();
        renderTable();
        updateRevenue(counts);
        renderChart(counts);
      } catch (error){
        console.error(error);
        showToast('Unable to load plan data', false);
      } finally {
        loader.style.display = 'none';
      }
    }

    // Auth Guard
    onAuthStateChanged(auth, async (user)=>{
      const session = await ensureSession();
      if(!session){
        return;
      }
      try {
        if(user){
          const adminDoc = await getDoc(doc(db,'admins',user.uid));
          const token = await getIdTokenResult(user);
          const isAdmin = adminDoc.exists() || token.claims.isAdmin === true;
          if(!isAdmin){
            await signOut(auth);
            await fetch('admin-logout.php', { method: 'GET', credentials: 'same-origin' });
            window.location.href = 'index.html';
            return;
          }
        } else {
          console.warn('Firebase admin user not available; continuing with PHP session only.');
        }
        if(!window.Chart){
          await loadChartJs();
        }
        loadPlanData();
      } catch(err){
        console.error(err);
        showToast('Authorisation failed', false);
        loader.style.display = 'none';
      }
    });

    async function loadChartJs(){
      return new Promise((resolve, reject)=>{
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }


