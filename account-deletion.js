const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

const requestBtn = document.querySelector('#requestBtn');
const statusMessage = document.querySelector('#statusMessage');

const buildMailtoLink = () => {
  const email = document.querySelector('#email').value.trim();
  const reason = document.querySelector('#reason').value.trim();

  if (!email) {
    statusMessage.textContent = 'Please provide your account email.';
    statusMessage.classList.add('visible');
    statusMessage.style.background = 'rgba(243, 115, 30, 0.16)';
    statusMessage.style.color = '#7a3a05';
    return null;
  }

  const lines = [
    'Hello YUSTAM Support,',
    '',
    'I would like to delete my YUSTAM Marketplace account and associated data.',
    '',
    `Account email: ${email}`,
  ];

  if (reason) {
    lines.push(`Reason for deletion: ${reason}`);
  }

  lines.push('', 'Thank you.');

  const subject = encodeURIComponent('Account deletion request');
  const body = encodeURIComponent(lines.join('\n'));

  return `mailto:support@yustam.com.ng?subject=${subject}&body=${body}`;
};

requestBtn.addEventListener('click', () => {
  const link = buildMailtoLink();
  if (!link) {
    return;
  }

  statusMessage.textContent = 'Email draft created. Your mail app will open.';
  statusMessage.classList.add('visible');
  statusMessage.style.background = 'rgba(0, 77, 64, 0.1)';
  statusMessage.style.color = '#0b3f35';
  window.location.href = link;
});
