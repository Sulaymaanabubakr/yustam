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
        // YUSTAM | HOMEPAGE BUTTON LINKS
        // =============================
        document.addEventListener("DOMContentLoaded", () => {
        // Select the Sign In button
        const signInBtn = document.querySelector(".vendor-btn.primary");
        // Select the Become a Vendor button
        const becomeVendorBtn = document.querySelector(".vendor-btn.secondary");

        // When "Sign In" is clicked → go to vendor-login.html
        if (signInBtn) {
            signInBtn.addEventListener("click", () => {
            window.location.href = "vendor-login.html";
            });
        }

        // When "Become a Vendor" is clicked → go to vendor-register.html
        if (becomeVendorBtn) {
            becomeVendorBtn.addEventListener("click", () => {
            window.location.href = "vendor-register.html";
            });
        }
        });


import { app } from "./firebase.js";
  console.log("🔥 Script is running!");
  console.log("✅ Firebase Connected:", app.name);
