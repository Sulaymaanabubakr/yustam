// <!-- Gallery interaction -->
        const mainImage = document.getElementById('mainImage');
        const thumbStrip = document.getElementById('thumbStrip');

        if (thumbStrip) {
            thumbStrip.addEventListener('click', (event) => {
                const target = event.target.closest('button');
                if (!target || !target.dataset.image) return;

                mainImage.style.opacity = '0';
                setTimeout(() => {
                    mainImage.src = target.dataset.image;
                    mainImage.style.opacity = '1';
                }, 150);

                thumbStrip.querySelectorAll('button').forEach((btn) => btn.classList.remove('active'));
                target.classList.add('active');
            });
        }

        // Placeholder interactions for CTA buttons
        document.getElementById('addToCartBtn').addEventListener('click', () => {
            alert('Add to cart functionality coming soon!');
        });
        document.getElementById('whatsappBtn').addEventListener('click', () => {
            window.open('https://wa.me/2348031234567', '_blank');
        });
