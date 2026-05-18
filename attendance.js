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
    
    // Mock Data for assigned souls based on phone number
    const mockDatabase = {
        '0248505033': {
            name: 'Charles Andrae Hiagbe',
            souls: [
                { id: 1, name: 'Prince Tetteh' },
                { id: 2, name: 'John Doe' }
            ]
        }
    };
    
    let currentCaregiver = null;
    let currentSouls = [];
    
    function showError(msg) {
        errorMsg.textContent = msg;
        errorToast.classList.add('show');
        setTimeout(() => errorToast.classList.remove('show'), 3000);
    }
    
    // Auto-check phone input
    phoneInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length >= 10) {
            // Mock API call
            const user = mockDatabase[val];
            if (user) {
                phoneInput.style.borderColor = '#14b8a6';
                phoneCheck.style.display = 'block';
                phoneCheck.style.color = '#14b8a6';
                
                caregiverNameEl.textContent = user.name;
                welcomeMsg.style.display = 'block';
                checkBtn.disabled = false;
                
                currentCaregiver = user;
                currentSouls = user.souls.map(s => ({ ...s, present: true })); // default selected
            } else {
                phoneInput.style.borderColor = '#ef4444';
                phoneCheck.style.display = 'none';
                welcomeMsg.style.display = 'none';
                checkBtn.disabled = true;
            }
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
        
        // Populate list
        soulCount.textContent = currentSouls.length;
        renderSouls();
        updateSelectedCount();
        
        loginStep.style.display = 'none';
        attendanceStep.style.display = 'block';
    });
    
    function renderSouls() {
        soulsList.innerHTML = '';
        currentSouls.forEach((soul, idx) => {
            const div = document.createElement('div');
            div.className = `soul-item ${soul.present ? 'selected' : ''}`;
            div.innerHTML = `
                <div class="checkbox-circle ${soul.present ? 'checked' : ''}">
                    ${soul.present ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="3" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                </div>
                <span style="font-weight: 500; color: #0f172a;">${soul.name}</span>
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
        const targetState = selected < total; // If not all selected, select all. Else deselect all.
        
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
        
        // Mock submission to API
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
        phoneInput.dispatchEvent(new Event('input'));
    });
});
