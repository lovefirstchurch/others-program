document.addEventListener('DOMContentLoaded', () => {
    const loginStep = document.getElementById('login-step');
    const attendanceStep = document.getElementById('attendance-step');
    const successStep = document.getElementById('success-step');

    const phoneInput = document.getElementById('login-phone');
    const phoneStatus = document.getElementById('phone-status');
    const welcomeMsg = document.getElementById('welcome-msg');
    const welcomeAvatar = document.getElementById('welcome-avatar');
    const caregiverNameEl = document.getElementById('caregiver-name');
    const checkBtn = document.getElementById('check-btn');

    const soulsList = document.getElementById('souls-list');
    const soulCountPill = document.getElementById('soul-count-pill');
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

    function resetLoginState() {
        phoneInput.classList.remove('valid', 'invalid');
        phoneStatus.innerHTML = '';
        welcomeMsg.style.display = 'none';
        checkBtn.disabled = true;
        currentCaregiver = null;
        currentSouls = [];
    }

    function showSpinner() {
        phoneStatus.innerHTML = '<div class="phone-spinner"></div>';
    }

    function showCheckmark() {
        phoneStatus.innerHTML = '<div class="phone-checkmark"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fa7b6e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>';
    }

    function showStep(step) {
        [loginStep, attendanceStep, successStep].forEach(s => s.style.display = 'none');
        step.style.display = 'block';
        // Re-trigger animation
        step.classList.remove('step-animate');
        void step.offsetWidth;
        step.classList.add('step-animate');
    }

    // ─── Phone Input ───
    phoneInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        clearTimeout(debounceTimer);

        if (val.length < 10) {
            resetLoginState();
            return;
        }

        showSpinner();
        phoneInput.classList.remove('valid', 'invalid');

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/assignments?phone=${encodeURIComponent(val)}`);
                const data = await res.json();

                if (data.success && data.caregiver) {
                    phoneInput.classList.add('valid');
                    showCheckmark();

                    const name = data.caregiver.full_name;
                    caregiverNameEl.textContent = name;
                    welcomeAvatar.textContent = name.charAt(0).toUpperCase();
                    welcomeMsg.style.display = 'flex';
                    checkBtn.disabled = false;

                    currentCaregiver = data.caregiver;
                    currentSouls = (data.souls || []).map(s => ({ ...s, present: true }));
                } else {
                    phoneInput.classList.add('invalid');
                    phoneStatus.innerHTML = '';
                    welcomeMsg.style.display = 'none';
                    checkBtn.disabled = true;
                    showError('Phone number not found in the program.');
                }
            } catch (err) {
                console.error(err);
                phoneInput.classList.add('invalid');
                phoneStatus.innerHTML = '';
                showError('Connection error. Please try again.');
            }
        }, 500);
    });

    // ─── Check Attendance ───
    checkBtn.addEventListener('click', () => {
        if (!currentCaregiver) return;

        soulCountPill.textContent = currentSouls.length;
        renderSouls();
        updateSelectedCount();
        showStep(attendanceStep);
    });

    function renderSouls() {
        soulsList.innerHTML = '';

        if (!currentSouls.length) {
            soulsList.innerHTML = `
                <div style="text-align:center; color:#94a3b8; padding:2.5rem 1rem;">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom:0.75rem;"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
                    <p style="font-weight:500;">No souls assigned to you yet.</p>
                    <p style="font-size:0.8rem; margin-top:0.3rem;">Please contact your admin.</p>
                </div>`;
            return;
        }

        currentSouls.forEach((soul, idx) => {
            const div = document.createElement('div');
            div.className = `soul-item ${soul.present ? 'selected' : ''}`;
            div.innerHTML = `
                <div class="checkbox-circle ${soul.present ? 'checked' : ''}">
                    ${soul.present ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="3" fill="none"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                </div>
                <div>
                    <div style="font-weight:600; color:#0f172a; font-size:0.95rem;">${soul.full_name}</div>
                    ${soul.phone_number ? `<div style="font-size:0.8rem; color:#94a3b8;">${soul.phone_number}</div>` : ''}
                </div>
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
        toggleAllBtn.textContent = selected === total ? 'Deselect All' : 'Select All';
    }

    toggleAllBtn.addEventListener('click', () => {
        const allSelected = currentSouls.every(s => s.present);
        currentSouls = currentSouls.map(s => ({ ...s, present: !allSelected }));
        renderSouls();
        updateSelectedCount();
    });

    backBtn.addEventListener('click', () => showStep(loginStep));

    // ─── Submit ───
    submitBtn.addEventListener('click', () => {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            showStep(successStep);

            if (typeof confetti === 'function') {
                confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            }
        }, 800);
    });

    // ─── Done ───
    doneBtn.addEventListener('click', () => {
        showStep(loginStep);
        phoneInput.value = '';
        resetLoginState();
    });
});
