// Placeholder for Google AdSense integration
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});

// Header shrink on scroll
        const header = document.querySelector('header');
        const toggleHeaderState = () => {
            if (window.scrollY > 20) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', toggleHeaderState, { passive: true });
        toggleHeaderState();

        // Hero fade-in animation
        window.addEventListener('DOMContentLoaded', () => {
            document.getElementById('hero-content').classList.add('in-view');
        });

        // Intersection Observer for fade-up elements
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

        // Hero search interaction (placeholder functionality)
        document.getElementById('heroSearchBtn').addEventListener('click', () => {
            const location = document.getElementById('heroLocation').value;
            const query = document.getElementById('heroQuery').value.trim();
            const message = query ? `Searching "${query}" in ${location}` : `Browsing listings in ${location}`;
            alert(message);
        });

        // Replace skeletons after simulated load
        setTimeout(() => {
            document.querySelectorAll('#featured-grid .listing-card.skeleton').forEach(card => card.remove());
        }, 2500);

        // Service worker registration
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js').catch(console.error);
            });
        }

        // =============================
        // YUSTAM | HEADER LOGIN DROPDOWN
        // =============================
        document.addEventListener('DOMContentLoaded', () => {
            const loginToggle = document.querySelector('.login-toggle');
            const loginMenu = document.getElementById('loginMenu');

            if (!loginToggle || !loginMenu) {
                return;
            }

            const hideMenu = () => {
                loginMenu.classList.remove('is-visible');
                loginMenu.setAttribute('aria-hidden', 'true');
                loginToggle.setAttribute('aria-expanded', 'false');
            };

            loginToggle.addEventListener('click', (event) => {
                event.stopPropagation();
                const willOpen = !loginMenu.classList.contains('is-visible');
                loginMenu.classList.toggle('is-visible', willOpen);
                loginMenu.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
                loginToggle.setAttribute('aria-expanded', String(willOpen));
            });

            loginMenu.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            document.addEventListener('click', (event) => {
                if (!loginMenu.contains(event.target) && !loginToggle.contains(event.target)) {
                    hideMenu();
                }
            });

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    hideMenu();
                }
            });
        });


import { app } from "./firebase.js";
  console.log("🔥 Script is running!");
  console.log("✅ Firebase Connected:", app.name);
