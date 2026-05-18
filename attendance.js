document.addEventListener('DOMContentLoaded', () => {
    const loginStep = document.getElementById('login-step');
    const attendanceStep = document.getElementById('attendance-step');
    const successStep = document.getElementById('success-step');
    
    const phoneInput = document.getElementById('login-phone');
    const phoneCheck = document.getElementById('phone-check');
    const welcomeMsg = document.getElementById('welcome-msg');
    const caregiverNameEl = document.getElementById('caregiver-name');
    const checkBtn = document.getElementById('check-btn');
    
    const soulsList = document.getElementById('souls-list');
    const soulCount = document.getElementById('soul-count');
    const selectedCount = document.getElementById('selected-count');
    const toggleAllBtn = document.getElementById('toggle-all-btn');
    const submitBtn = document.getElementById('submit-attendance-btn');
    const backBtn = document.getElementById('back-btn');
    const doneBtn = document.getElementById('done-btn');
    
    const errorToast = document.getElementById('error-toast');
    const errorMsg = document.getElementById('error-msg');

    let currentCaregiver = null;
    let currentSouls = [];
    let debounceTimer;
    
    function showError(msg) {
        errorMsg.textContent = msg;
        errorToast.classList.add('show');
        setTimeout(() => errorToast.classList.remove('show'), 3000);
    }

    function showInvalid() {
        phoneInput.style.borderColor = '#ef4444';
        phoneCheck.style.display = 'none';
        welcomeMsg.style.display = 'none';
        checkBtn.disabled = true;
        currentCaregiver = null;
        currentSouls = [];
    }
    
    // Auto-check phone input — hits /api/assignments?phone=... which returns caregiver + assigned souls
    phoneInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        
        clearTimeout(debounceTimer);
        
        if (val.length >= 10) {
            debounceTimer = setTimeout(async () => {
                try {
                    phoneInput.style.borderColor = '#e2e8f0'; // loading state
                    const res = await fetch(`/api/assignments?phone=${encodeURIComponent(val)}`);
                    const data = await res.json();
                    
                    if (data.success && data.caregiver) {
                        phoneInput.style.borderColor = '#14b8a6';
                        phoneCheck.style.display = 'block';
                        phoneCheck.style.color = '#14b8a6';
                        
                        caregiverNameEl.textContent = data.caregiver.full_name;
                        welcomeMsg.style.display = 'block';
                        checkBtn.disabled = false;
                        
                        currentCaregiver = data.caregiver;
                        currentSouls = (data.souls || []).map(s => ({ ...s, present: true }));
                    } else {
                        showInvalid();
                    }
                } catch (err) {
                    console.error(err);
                    showInvalid();
                }
            }, 500);
        } else {
            phoneInput.style.borderColor = '';
            phoneCheck.style.display = 'none';
            welcomeMsg.style.display = 'none';
            checkBtn.disabled = true;
        }
    });
    
    // Go to attendance
    checkBtn.addEventListener('click', () => {
        if (!currentCaregiver) return;
        
        soulCount.textContent = currentSouls.length;
        renderSouls();
        updateSelectedCount();
        
        loginStep.style.display = 'none';
        attendanceStep.style.display = 'block';
    });
    
    function renderSouls() {
        soulsList.innerHTML = '';

        if (!currentSouls.length) {
            soulsList.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:2rem;">No souls have been assigned to you yet.</div>';
            return;
        }

        currentSouls.forEach((soul, idx) => {
            const div = document.createElement('div');
            div.className = `soul-item ${soul.present ? 'selected' : ''}`;
            div.innerHTML = `
                <div class="checkbox-circle ${soul.present ? 'checked' : ''}">
                    ${soul.present ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="3" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                </div>
                <span style="font-weight: 500; color: #0f172a;">${soul.full_name}</span>
            `;
            div.addEventListener('click', () => {
                currentSouls[idx].present = !currentSouls[idx].present;
                renderSouls();
                updateSelectedCount();
            });
            soulsList.appendChild(div);
        });
    }
    
    function updateSelectedCount() {
        const selected = currentSouls.filter(s => s.present).length;
        const total = currentSouls.length;
        selectedCount.textContent = `${selected} / ${total}`;
        
        if (selected === total) {
            toggleAllBtn.textContent = 'Deselect All';
        } else {
            toggleAllBtn.textContent = 'Select All';
        }
    }
    
    toggleAllBtn.addEventListener('click', () => {
        const selected = currentSouls.filter(s => s.present).length;
        const total = currentSouls.length;
        const targetState = selected < total;
        
        currentSouls = currentSouls.map(s => ({ ...s, present: targetState }));
        renderSouls();
        updateSelectedCount();
    });
    
    backBtn.addEventListener('click', () => {
        attendanceStep.style.display = 'none';
        loginStep.style.display = 'block';
    });
    
    submitBtn.addEventListener('click', () => {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        // For now mock — later we can POST attendance records
        setTimeout(() => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            
            attendanceStep.style.display = 'none';
            successStep.style.display = 'block';
            
            if (typeof confetti === 'function') {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
        }, 800);
    });
    
    doneBtn.addEventListener('click', () => {
        successStep.style.display = 'none';
        loginStep.style.display = 'block';
        phoneInput.value = '';
        phoneInput.style.borderColor = '';
        phoneCheck.style.display = 'none';
        welcomeMsg.style.display = 'none';
        checkBtn.disabled = true;
        currentCaregiver = null;
        currentSouls = [];
    });
});
