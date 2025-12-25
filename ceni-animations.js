(function() {
    'use strict';

    // ========================================
    // CONFIGURAÇÃO
    // ========================================
    const CONFIG = {
        smoothScrollDuration: 800,
        smoothScrollEasing: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        progressThrottle: 16,
        sectionDetectionOffset: 100
    };

    // ========================================
    // SMOOTH SCROLL PROGRAMÁTICO
    // ========================================
    function smoothScrollTo(target, duration = CONFIG.smoothScrollDuration) {
        const startPosition = window.pageYOffset;
        const targetPosition = target.getBoundingClientRect().top + startPosition;
        const distance = targetPosition - startPosition;
        let startTime = null;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const ease = CONFIG.smoothScrollEasing(progress);
            
            window.scrollTo(0, startPosition + (distance * ease));

            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            }
        }

        requestAnimationFrame(animation);
    }

    // ========================================
    // PARALLAX DESABILITADO
    // ========================================
    const parallaxElements = [];
    let ticking = false;

    function updateParallax() {
        // Função vazia - parallax desabilitado
        ticking = false;
    }

    function requestParallaxUpdate() {
        // Não faz nada - parallax desabilitado
        ticking = false;
    }

    // ========================================
    // INDICADOR DE PROGRESSO REFINADO
    // ========================================
    const progressBar = document.getElementById('progressBar');
    let progressTicking = false;

    function updateProgress() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        
        if (progressBar) {
            progressBar.style.width = scrolled + '%';
        }
        
        progressTicking = false;
    }

    function requestProgressUpdate() {
        if (!progressTicking) {
            requestAnimationFrame(updateProgress);
            progressTicking = true;
        }
    }

    // ========================================
    // DETECÇÃO DE SEÇÃO ATIVA (OTIMIZADA)
    // ========================================
    let sectionUpdateTimeout;
    
    function updateActiveSection() {
        const sections = document.querySelectorAll('section[id], .gt-section[id]');
        const navLinks = document.querySelectorAll('.main-nav a[href^="#"], .nav-grid a[href^="#"]');
        
        // Usar apenas as seções visíveis
        if (sections.length === 0) return;
        
        let currentSection = '';
        const scrollPosition = window.pageYOffset + CONFIG.sectionDetectionOffset;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + currentSection) {
                link.classList.add('active');
            }
        });
    }
    
    // Throttle para updateActiveSection
    function requestSectionUpdate() {
        if (!sectionUpdateTimeout) {
            sectionUpdateTimeout = setTimeout(() => {
                updateActiveSection();
                sectionUpdateTimeout = null;
            }, 200); // Executar no máximo a cada 200ms
        }
    }

    // ========================================
    // ANIMAÇÕES DE ENTRADA APRIMORADAS (OTIMIZADO)
    // ========================================
    const observerOptions = {
        threshold: [0, 0.1],  // Reduzido de [0, 0.1, 0.5] para menos cálculos
        rootMargin: '0px 0px -10% 0px'
    };

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const delay = element.getAttribute('data-delay') || '0';
                
                // Delay simplificado - sem cálculo baseado em posição
                const totalDelay = parseInt(delay);
                
                setTimeout(() => {
                    element.classList.add('animated');
                    
                    // Disparar evento customizado
                    element.dispatchEvent(new CustomEvent('ceni:animated', {
                        detail: { element }
                    }));
                }, totalDelay);
                
                // Parar de observar imediatamente
                animationObserver.unobserve(element);
            }
        });
    }, observerOptions);

    // ========================================
    // SCROLL SNAP DESABILITADO
    // ========================================
    // Snap removido para evitar conflitos com scroll natural
    let scrollTimeout;
    let lastScrollTop = 0;

    function handleScrollEnd() {
        // Função vazia - snap desabilitado para melhor performance
    }

    // ========================================
    // NAVEGAÇÃO SUAVE PARA ÂNCORAS
    // ========================================
    function initSmoothLinks() {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Ignorar links vazios ou apenas "#"
                if (href === '#' || href === '') return;
                
                const target = document.querySelector(href);
                
                if (target) {
                    e.preventDefault();
                    smoothScrollTo(target);
                    
                    // Atualizar URL sem causar scroll
                    if (history.pushState) {
                        history.pushState(null, null, href);
                    }
                }
            });
        });
    }

    // ========================================
    // BACK TO TOP APRIMORADO
    // ========================================
    function initBackToTop() {
        const backToTop = document.getElementById('backToTop');
        
        if (backToTop) {
            backToTop.addEventListener('click', (e) => {
                e.preventDefault();
                smoothScrollTo(document.body, 600);
            });
        }
    }

    // ========================================
    // PREVENÇÃO DE JANK EM SCROLL (OTIMIZADO)
    // ========================================
    let scrollTimer;
    let isScrolling = false;
    
    function handleScroll() {
        // Cancelar timer anterior
        clearTimeout(scrollTimer);
        
        // Adicionar classe durante scroll (apenas uma vez)
        if (!isScrolling) {
            document.body.classList.add('is-scrolling');
            isScrolling = true;
        }
        
        // Atualizar apenas o progress bar (mais leve)
        requestProgressUpdate();
        
        // Remover classe após scroll terminar
        scrollTimer = setTimeout(() => {
            document.body.classList.remove('is-scrolling');
            isScrolling = false;
            // Atualizar seção ativa apenas quando parar de rolar
            requestSectionUpdate();
        }, 150);
    }

    // ========================================
    // INICIALIZAÇÃO
    // ========================================
    function init() {
        // Verificar preferência de movimento reduzido
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            console.log('⚡ CENI Scroll: Modo reduzido respeitado');
            return;
        }

        // Observar elementos com data-animate
        const animatedElements = document.querySelectorAll('[data-animate]');
        animatedElements.forEach(el => animationObserver.observe(el));

        // Inicializar navegação suave
        initSmoothLinks();
        initBackToTop();

        // Adicionar listener de scroll otimizado com passive
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Primeira execução (apenas progress)
        updateProgress();
        // Atualizar seção ativa após um pequeno delay inicial
        setTimeout(requestSectionUpdate, 100);

        console.log(`⚡ CENI Enhanced Scroll: Sistema ativado (OTIMIZADO)`);
        console.log(`   → Animações: ${animatedElements.length} elementos`);
    }

    // Executar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ========================================
    // API PÚBLICA
    // ========================================
    window.CENIScroll = {
        scrollTo: smoothScrollTo,
        refresh: () => {
            updateProgress();
            requestSectionUpdate();
        },
        stats: () => {
            console.log('📊 CENI Scroll Stats (Otimizado):');
            console.log(`   Scroll position: ${window.pageYOffset}px`);
            console.log(`   Progress: ${Math.round((window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100)}%`);
            console.log(`   Performance mode: ACTIVE`);
        }
    };

})();
