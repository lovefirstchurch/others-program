document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    const submitBtn = document.getElementById('submit-btn');
    const toast = document.getElementById('success-toast');
    
    // Add micro-interactions for inputs
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', (e) => {
            const label = e.target.previousElementSibling;
            if(label && label.tagName === 'LABEL') {
                label.style.color = 'var(--brand-blue)'; // Highlight color
            }
        });
        
        input.addEventListener('blur', (e) => {
            const label = e.target.previousElementSibling;
            if(label && label.tagName === 'LABEL') {
                label.style.color = 'var(--text-primary)';
            }
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Form Validation
        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('phoneNumber').value.trim();
        const pastor = document.getElementById('pastorName').value.trim();
        const location = document.getElementById('location').value;

        if (!fullName || !phone || !pastor || !location) {
            // Shake animation for error
            form.style.animation = 'none';
            form.offsetHeight; /* trigger reflow */
            form.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
            return;
        }

        // Submit data to Vercel Serverless Function
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            
            if (data.success) {
                // Trigger Confetti
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }
                
                // Show Success Toast
                toast.classList.add('show');
                form.reset();
                
                // Hide toast after 4 seconds
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 4000);
            } else {
                alert('Submission failed: ' + data.error);
            }
        })
        .catch(error => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        });
    });
});

// Add shake animation style dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(2px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
        40%, 60% { transform: translate3d(4px, 0, 0); }
    }
`;
document.head.appendChild(style);
