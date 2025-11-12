// Intersection Observer for fade-up animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2
        });

        document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

        // FAQ accordion behaviour
        const faqItems = document.querySelectorAll('.faq-item');

        faqItems.forEach(item => {
            const button = item.querySelector('.faq-question');
            button.addEventListener('click', () => {
                const isActive = item.classList.contains('active');

                faqItems.forEach(other => {
                    if (other !== item) {
                        other.classList.remove('active');
                        other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                    }
                });

                if (isActive) {
                    item.classList.remove('active');
                    button.setAttribute('aria-expanded', 'false');
                } else {
                    item.classList.add('active');
                    button.setAttribute('aria-expanded', 'true');
                }
            });
        });
