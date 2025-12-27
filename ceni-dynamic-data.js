(function() {
    'use strict';

    // ========================================
    // CONFIGURAÇÃO DA API
    // ========================================
    
    const API_CONFIG = {
        // IMPORTANTE: Substitua esta URL pela URL do seu Google Apps Script implantado
        BASE_URL: 'https://script.google.com/macros/s/AKfycbwK2yrE4LdANPPvzEztemfcrea2nE5B93tESSgmB6E0WKzsHNtPa-XwXAWfdYWMYZw/exec',
        CACHE_DURATION: 1800000, // 30 minutos em milissegundos
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    };

    // ========================================
    // SISTEMA DE CACHE LOCAL
    // ========================================
    
    class LocalCache {
        static set(key, data) {
            const cacheData = {
                timestamp: Date.now(),
                data: data
            };
            try {
                localStorage.setItem(`ceni_${key}`, JSON.stringify(cacheData));
            } catch (e) {
                console.warn('LocalStorage não disponível:', e);
            }
        }

        static get(key) {
            try {
                const cached = localStorage.getItem(`ceni_${key}`);
                if (!cached) return null;

                const cacheData = JSON.parse(cached);
                const age = Date.now() - cacheData.timestamp;

                if (age < API_CONFIG.CACHE_DURATION) {
                    return cacheData.data;
                }

                localStorage.removeItem(`ceni_${key}`);
                return null;
            } catch (e) {
                console.warn('Erro ao ler cache:', e);
                return null;
            }
        }

        static clear() {
            try {
                Object.keys(localStorage)
                    .filter(key => key.startsWith('ceni_'))
                    .forEach(key => localStorage.removeItem(key));
                console.log('Cache local limpo com sucesso');
            } catch (e) {
                console.warn('Erro ao limpar cache:', e);
            }
        }
    }

    // ========================================
    // CLIENTE DA API
    // ========================================
    
    class CENIApiClient {
        static async fetch(endpoint, params = {}, attempt = 1) {
            // Verificar cache primeiro
            const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
            const cached = LocalCache.get(cacheKey);
            
            if (cached) {
                console.log(`📦 Dados carregados do cache: ${endpoint}`);
                return cached;
            }

            // Construir URL
            const queryParams = new URLSearchParams(params);
            queryParams.set('action', endpoint);
            const url = `${API_CONFIG.BASE_URL}?${queryParams.toString()}`;

            try {
                console.log(`🌐 Buscando dados: ${endpoint} (tentativa ${attempt})`);
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }

                // Armazenar no cache
                LocalCache.set(cacheKey, data);
                
                console.log(`✅ Dados carregados: ${endpoint}`, data);
                return data;

            } catch (error) {
                console.error(`❌ Erro ao buscar ${endpoint}:`, error);

                // Retry com backoff exponencial
                if (attempt < API_CONFIG.RETRY_ATTEMPTS) {
                    const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
                    console.log(`⏳ Tentando novamente em ${delay}ms...`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.fetch(endpoint, params, attempt + 1);
                }

                throw error;
            }
        }

        static async getProximoEvento() {
            return this.fetch('proximo_evento');
        }

        static async getEventos(filters = {}) {
            return this.fetch('eventos', filters);
        }

        static async getDocumentos(filters = {}) {
            return this.fetch('documentos', filters);
        }

        static async getMembros(filters = {}) {
            return this.fetch('membros', filters);
        }

        static async getConfiguracoes() {
            return this.fetch('configuracoes');
        }
    }

    // ========================================
    // RENDERIZADORES DE COMPONENTES
    // ========================================
    
    class ProximoEventoRenderer {
        static render(container, eventoData) {
            if (!container) {
                console.warn('Container do próximo evento não encontrado');
                return;
            }

            if (!eventoData || !eventoData.data) {
                this.renderEmpty(container);
                return;
            }

            const evento = eventoData.data;
            
            const html = `
                <div class="proximo-evento-card" data-animate="fade-up">
                    <div class="evento-badge">${this.getTipoBadge(evento.tipo)}</div>
                    <div class="evento-content">
                        <div class="evento-meta">
                            <span class="evento-data">
                                <i class="fas fa-calendar-alt"></i> ${evento.data}
                            </span>
                            ${evento.horario ? `
                                <span class="evento-horario">
                                    <i class="fas fa-clock"></i> ${evento.horario}
                                </span>
                            ` : ''}
                        </div>
                        
                        <h3 class="evento-titulo">${evento.titulo}</h3>
                        
                        <p class="evento-descricao">${evento.descricao}</p>
                        
                        <div class="evento-local">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${evento.local}</span>
                        </div>
                        
                        ${evento.link_inscricao ? `
                            <a href="${evento.link_inscricao}" 
                               class="btn-evento" 
                               target="_blank" 
                               rel="noopener noreferrer">
                                <i class="fas fa-external-link-alt"></i>
                                Inscreva-se
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;

            container.innerHTML = html;
        }

        static renderEmpty(container) {
            container.innerHTML = `
                <div class="proximo-evento-empty" data-animate="fade-up">
                    <i class="fas fa-calendar-check"></i>
                    <h4>Próximos Eventos em Breve</h4>
                    <p>Novos eventos serão anunciados em breve. Acompanhe nossas atualizações.</p>
                </div>
            `;
        }

        static renderError(container) {
            container.innerHTML = `
                <div class="proximo-evento-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Não foi possível carregar informações do evento no momento.</p>
                </div>
            `;
        }

        static getTipoBadge(tipo) {
            const badges = {
                'Reunião Ordinária': '📋 Reunião Ordinária',
                'Workshop': '🎯 Workshop',
                'Lançamento': '🚀 Lançamento',
                'Evento Público': '🎤 Evento Público'
            };
            return badges[tipo] || tipo;
        }
    }

    // ========================================
    // INICIALIZAÇÃO DO SISTEMA
    // ========================================
    
    async function initProximoEvento() {
        const container = document.getElementById('proximoEventoContainer');
        
        if (!container) {
            console.log('Container de próximo evento não encontrado nesta página');
            return;
        }

        // Mostrar loading
        container.innerHTML = `
            <div class="loading-evento">
                <div class="loading-spinner"></div>
                <p>Carregando próximo evento...</p>
            </div>
        `;

        try {
            const eventoData = await CENIApiClient.getProximoEvento();
            ProximoEventoRenderer.render(container, eventoData);
            
            // Disparar evento customizado para animações
            if (window.CENIScroll && window.CENIScroll.refresh) {
                setTimeout(() => window.CENIScroll.refresh(), 100);
            }
            
        } catch (error) {
            console.error('Erro ao carregar próximo evento:', error);
            ProximoEventoRenderer.renderError(container);
        }
    }

    // ========================================
    // INICIALIZAÇÃO GLOBAL
    // ========================================
    
    function init() {
        console.log('🎯 CENI Dynamic Data System - Inicializando...');
        
        // Verificar se API está configurada
        if (API_CONFIG.BASE_URL.includes('SEU_SCRIPT_ID_AQUI')) {
            console.warn('⚠️  API não configurada! Atualize API_CONFIG.BASE_URL com a URL do seu Google Apps Script.');
            return;
        }

        // Inicializar componentes presentes na página
        initProximoEvento();
        
        console.log('✅ CENI Dynamic Data System - Pronto!');
    }

    // Executar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ========================================
    // API PÚBLICA PARA CONSOLE
    // ========================================
    
    window.CENI = window.CENI || {};
    window.CENI.Data = {
        // Funções para desenvolvedores testarem no console
        getProximoEvento: () => CENIApiClient.getProximoEvento(),
        getEventos: (filters) => CENIApiClient.getEventos(filters),
        getDocumentos: (filters) => CENIApiClient.getDocumentos(filters),
        getMembros: (filters) => CENIApiClient.getMembros(filters),
        getConfiguracoes: () => CENIApiClient.getConfiguracoes(),
        
        // Utilitários
        clearCache: () => LocalCache.clear(),
        
        // Info
        version: '1.0',
        config: API_CONFIG
    };

})();
