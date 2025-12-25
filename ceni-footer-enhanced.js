/* ========================================
   FOOTER ENHANCED - JAVASCRIPT
   Comportamentos interativos e accordion mobile
   ======================================== */

(function() {
    'use strict';

    // ========================================
    // INICIALIZAÇÃO
    // ========================================
    
    function initFooterEnhancements() {
        initMobileAccordion();
        initCopyToClipboard();
        initFooterAnimation();
    }

    // ========================================
    // ACCORDION MOBILE
    // ========================================
    
    function initMobileAccordion() {
        // Detectar se está em mobile
        const isMobile = window.innerWidth <= 968;
        
        if (!isMobile) return;
        
        const footerSections = document.querySelectorAll('.footer-section-enhanced');
        
        footerSections.forEach((section, index) => {
            const header = section.querySelector('h4');
            const content = section.querySelector('.footer-section-content');
            
            if (!header || !content) return;
            
            // Primeira seção expandida por padrão
            if (index === 0) {
                section.classList.add('expanded');
            }
            
            // Click handler
            header.addEventListener('click', function() {
                const isExpanded = section.classList.contains('expanded');
                
                // Opção 1: Fechar outras seções (comportamento exclusivo)
                // footerSections.forEach(s => s.classList.remove('expanded'));
                
                // Opção 2: Permitir múltiplas seções abertas
                if (isExpanded) {
                    section.classList.remove('expanded');
                    header.setAttribute('aria-expanded', 'false');
                } else {
                    section.classList.add('expanded');
                    header.setAttribute('aria-expanded', 'true');
                }
            });
            
            // Acessibilidade
            header.setAttribute('role', 'button');
            header.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
            header.setAttribute('tabindex', '0');
            
            // Suporte para teclado
            header.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    header.click();
                }
            });
        });
    }

    // ========================================
    // COPY TO CLIPBOARD (EMAILS)
    // ========================================
    
    function initCopyToClipboard() {
        const emailLinks = document.querySelectorAll('.footer-contact-link[href^="mailto:"]');
        
        emailLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Não prevenir default - permitir que mailto funcione
                const email = this.href.replace('mailto:', '');
                
                // Tentar copiar para clipboard
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(email).then(() => {
                        showCopyFeedback(this);
                    }).catch(err => {
                        console.log('Erro ao copiar:', err);
                    });
                }
            });
        });
    }
    
    function showCopyFeedback(element) {
        // Criar tooltip temporário
        const tooltip = document.createElement('span');
        tooltip.textContent = 'Email copiado!';
        tooltip.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%) translateY(-8px);
            background: var(--primary, #1e3a8a);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            white-space: nowrap;
            pointer-events: none;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        // Posicionar relativamente
        element.style.position = 'relative';
        element.appendChild(tooltip);
        
        // Animar entrada
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
        });
        
        // Remover após 2 segundos
        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 300);
        }, 2000);
    }

    // ========================================
    // ANIMAÇÃO DE ENTRADA DO FOOTER
    // ========================================
    
    function initFooterAnimation() {
        const footer = document.querySelector('.page-footer-enhanced');
        
        if (!footer || !footer.hasAttribute('data-animate')) return;
        
        // Intersection Observer para animar quando footer entra em viewport
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    footer.style.animationPlayState = 'running';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        observer.observe(footer);
    }

    // ========================================
    // RE-INICIALIZAR EM RESIZE
    // ========================================
    
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            // Re-verificar se precisa accordion
            const wasMobile = document.querySelector('.footer-section-enhanced.expanded') !== null;
            const isMobileNow = window.innerWidth <= 968;
            
            if (wasMobile !== isMobileNow) {
                // Remover classes e event listeners antigos
                const footerSections = document.querySelectorAll('.footer-section-enhanced');
                footerSections.forEach(section => {
                    section.classList.remove('expanded');
                    const header = section.querySelector('h4');
                    if (header) {
                        header.removeAttribute('role');
                        header.removeAttribute('aria-expanded');
                        header.removeAttribute('tabindex');
                    }
                });
                
                // Re-inicializar
                initMobileAccordion();
            }
        }, 250);
    });

    // ========================================
    // EXECUTAR QUANDO DOM ESTIVER PRONTO
    // ========================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFooterEnhancements);
    } else {
        initFooterEnhancements();
    }

    // ========================================
    // API PÚBLICA (OPCIONAL)
    // ========================================
    
    window.CENIFooter = {
        refresh: initFooterEnhancements,
        expandSection: function(index) {
            const sections = document.querySelectorAll('.footer-section-enhanced');
            if (sections[index]) {
                sections[index].classList.add('expanded');
            }
        },
        collapseAll: function() {
            document.querySelectorAll('.footer-section-enhanced').forEach(section => {
                section.classList.remove('expanded');
            });
        }
    };

})();
