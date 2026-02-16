console.log('[APP BUILD] CBQD_FORCE_STEP2_v2');

const steps = document.querySelectorAll('.wizard-step');
let currentStep = 1;

function showStep(step) {
  steps.forEach(s => s.classList.add('hidden'));
  const target = document.querySelector(`[data-step="${step}"]`);
  if (target) target.classList.remove('hidden');
}

document.getElementById('btnStep1Next').addEventListener('click', () => {
  const form = document.getElementById('contextForm');
  if (form.checkValidity()) {
    currentStep = 2;
    showStep(2);
  } else {
    form.reportValidity();
  }
});

document.getElementById('btnStep2Next').addEventListener('click', () => {
  currentStep = 3;
  showStep(3);
});

showStep(1);
