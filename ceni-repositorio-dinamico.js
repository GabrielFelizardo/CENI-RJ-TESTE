(function() {
    'use strict';

    // ========================================
    // CONFIGURAÇÃO
    // ========================================
    
    const CONFIG = {
        // ID da planilha Google Sheets (será fornecido após criação)
        SHEET_ID: 'SUA_PLANILHA_ID_AQUI',
        
        // IDs das abas específicas (serão fornecidos após publicação)
        GID: {
            REPOSITORIO: 'GID_ABA_REPOSITORIO_AQUI',
            EVENTOS: 'GID_ABA_EVENTOS_AQUI',
            ORGANIZACOES: 'GID_ABA_ORGANIZACOES_AQUI',
            MEMBROS: 'GID_ABA_MEMBROS_AQUI',
            GTS: 'GID_ABA_GTS_AQUI'
        },
        
        // Tempo de cache em milissegundos (5 minutos)
        CACHE_DURATION: 5 * 60 * 1000,
        
        // Ícones por categoria de documento
        CATEGORY_ICONS: {
            'Documentos Institucionais': 'fas fa-landmark',
            'Atas de Reunião': 'fas fa-calendar-check',
            'Relatórios e Estudos': 'fas fa-chart-line',
            'Materiais de Apoio': 'fas fa-lightbulb'
        },
        
        // Ícones por status de documento
        STATUS_ICONS: {
            'Disponível': 'fas fa-download',
            'Em Breve': 'fas fa-clock',
            'Em Elaboração': 'fas fa-hourglass-half',
            'Em Desenvolvimento': 'fas fa-hourglass-half',
            'Em Construção': 'fas fa-tools',
            'Futuro': 'fas fa-calendar-alt'
        }
    };

    // ========================================
    // GERENCIAMENTO DE CACHE
    // ========================================
    
    const CacheManager = {
        set: function(key, data) {
            const cacheItem = {
                data: data,
                timestamp: Date.now()
            };
            try {
                localStorage.setItem('ceni_' + key, JSON.stringify(cacheItem));
            } catch (e) {
                console.warn('Cache não disponível:', e);
            }
        },
        
        get: function(key) {
            try {
                const cached = localStorage.getItem('ceni_' + key);
                if (!cached) return null;
                
                const cacheItem = JSON.parse(cached);
                const isExpired = Date.now() - cacheItem.timestamp > CONFIG.CACHE_DURATION;
                
                if (isExpired) {
                    localStorage.removeItem('ceni_' + key);
                    return null;
                }
                
                return cacheItem.data;
            } catch (e) {
                console.warn('Erro ao ler cache:', e);
                return null;
            }
        },
        
        clear: function() {
            try {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('ceni_')) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (e) {
                console.warn('Erro ao limpar cache:', e);
            }
        }
    };

    // ========================================
    // CONSUMO DE CSV PUBLICADO DO GOOGLE SHEETS
    // ========================================
    
    const SheetsCSV = {
        /**
         * Busca e processa dados de uma aba específica publicada como CSV
         * @param {string} gid - ID da aba específica (GID)
         * @returns {Promise<Array>} Array de objetos com dados da planilha
         */
        fetchSheet: async function(gid) {
            // Verificar cache primeiro
            const cachedData = CacheManager.get(gid);
            if (cachedData) {
                console.log(`📦 Dados da aba carregados do cache`);
                return cachedData;
            }
            
            // Construir URL do CSV publicado
            const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=csv&gid=${gid}`;
            
            try {
                console.log(`🔄 Buscando dados da planilha...`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
                }
                
                const csvText = await response.text();
                
                if (!csvText || csvText.trim().length === 0) {
                    console.warn(`⚠️ Nenhum dado encontrado na aba`);
                    return [];
                }
                
                // Parsear CSV para array de objetos
                const parsedData = this.parseCSV(csvText);
                
                if (parsedData.length === 0) {
                    console.warn(`⚠️ CSV vazio ou malformado`);
                    return [];
                }
                
                // Salvar no cache
                CacheManager.set(gid, parsedData);
                
                console.log(`✅ ${parsedData.length} registros carregados`);
                return parsedData;
                
            } catch (error) {
                console.error(`❌ Erro ao buscar dados:`, error);
                throw error;
            }
        },
        
        /**
         * Converte CSV em array de objetos
         * @param {string} csvText - Texto CSV completo
         * @returns {Array} Array de objetos onde cada objeto é uma linha
         */
        parseCSV: function(csvText) {
            const lines = csvText.split('\n').filter(line => line.trim().length > 0);
            
            if (lines.length < 2) {
                return [];
            }
            
            // Primeira linha é o cabeçalho
            const headers = this.parseCSVLine(lines[0]);
            
            // Demais linhas são os dados
            const data = [];
            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                
                // Criar objeto com headers como chaves
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                
                data.push(obj);
            }
            
            return data;
        },
        
        /**
         * Processa uma linha de CSV respeitando vírgulas dentro de aspas
         * @param {string} line - Linha do CSV
         * @returns {Array} Array de valores
         */
        parseCSVLine: function(line) {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];
                
                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        // Aspas duplas dentro de campo = uma aspa literal
                        current += '"';
                        i++; // Pular próxima aspa
                    } else {
                        // Alternar estado de dentro/fora de aspas
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    // Vírgula fora de aspas = separador de campo
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            
            // Adicionar último campo
            result.push(current.trim());
            
            return result;
        }
    };

    // ========================================
    // RENDERIZAÇÃO DO REPOSITÓRIO
    // ========================================
    
    const RepositorioRenderer = {
        /**
         * Renderiza a seção completa de repositório de documentos
         */
        render: async function() {
            try {
                // Buscar dados da planilha usando GID da aba Repositório
                const documentos = await SheetsCSV.fetchSheet(CONFIG.GID.REPOSITORIO);
                
                if (documentos.length === 0) {
                    this.renderEmpty();
                    return;
                }
                
                // Agrupar documentos por categoria
                const categorias = this.groupByCategory(documentos);
                
                // Renderizar cada categoria
                Object.keys(categorias).forEach((categoria, index) => {
                    this.renderCategory(categoria, categorias[categoria], index + 1);
                });
                
            } catch (error) {
                console.error('Erro ao renderizar repositório:', error);
                this.renderError(error);
            }
        },
        
        /**
         * Agrupa documentos por categoria
         */
        groupByCategory: function(documentos) {
            return documentos.reduce((acc, doc) => {
                const categoria = doc.Categoria || 'Outros';
                if (!acc[categoria]) {
                    acc[categoria] = [];
                }
                acc[categoria].push(doc);
                return acc;
            }, {});
        },
        
        /**
         * Renderiza uma categoria de documentos
         */
        renderCategory: function(categoria, documentos, numeroCategoria) {
            // Encontrar container principal
            const mainContent = document.getElementById('repositorio-content');
            if (!mainContent) {
                console.error('Container #repositorio-content não encontrado');
                return;
            }
            
            // Ordenar documentos por ordem especificada na planilha
            const docsOrdenados = documentos.sort((a, b) => {
                const ordemA = parseInt(a.Ordem) || 999;
                const ordemB = parseInt(b.Ordem) || 999;
                return ordemA - ordemB;
            });
            
            // Criar seção da categoria
            const section = document.createElement('section');
            section.className = 'categoria-section';
            section.setAttribute('data-animate', 'fade-up');
            
            const categoryIcon = CONFIG.CATEGORY_ICONS[categoria] || 'fas fa-folder';
            
            section.innerHTML = `
                <div class="swiss-grid">
                    <div class="col-full" style="position: relative;">
                        <span class="section-number" aria-hidden="true">${numeroCategoria.toString().padStart(2, '0')}</span>
                        <div class="categoria-header">
                            <span class="label">Categoria ${numeroCategoria.toString().padStart(2, '0')}</span>
                            <h2><i class="${categoryIcon}"></i> ${categoria}</h2>
                        </div>
                    </div>
                    
                    <ul class="documento-list" style="grid-column: 1 / -1;">
                        ${docsOrdenados.map((doc, index) => this.renderDocumento(doc, index + 1)).join('')}
                    </ul>
                </div>
            `;
            
            mainContent.appendChild(section);
        },
        
        /**
         * Renderiza um documento individual
         */
        renderDocumento: function(doc, numero) {
            const statusIcon = CONFIG.STATUS_ICONS[doc.Status] || 'fas fa-file';
            const hasLink = doc.Link && doc.Link.trim() !== '';
            const isDisabled = !hasLink;
            
            const buttonHTML = hasLink 
                ? `<a href="${doc.Link}" target="_blank" rel="noopener" class="btn-doc">
                       <i class="fas fa-download"></i> Download
                   </a>`
                : `<button class="btn-doc disabled" disabled>
                       <i class="${statusIcon}"></i> ${doc.Status}
                   </button>`;
            
            return `
                <li class="documento-item" data-animate="fade-up" data-delay="${(numero - 1) * 100}">
                    <div class="doc-number">${numero.toString().padStart(2, '0')}</div>
                    <div class="doc-info">
                        <h4>${doc.Título}</h4>
                        <p><i class="fas fa-info-circle"></i> ${doc.Descrição}</p>
                    </div>
                    ${buttonHTML}
                </li>
            `;
        },
        
        /**
         * Renderiza mensagem quando não há documentos
         */
        renderEmpty: function() {
            const mainContent = document.getElementById('repositorio-content');
            if (!mainContent) return;
            
            mainContent.innerHTML = `
                <div class="swiss-grid">
                    <div class="col-full">
                        <div class="em-breve-box">
                            <h3><i class="fas fa-hourglass-half"></i> Repositório em Construção</h3>
                            <p>Os documentos oficiais do CENI-RJ serão disponibilizados em breve.</p>
                        </div>
                    </div>
                </div>
            `;
        },
        
        /**
         * Renderiza mensagem de erro
         */
        renderError: function(error) {
            const mainContent = document.getElementById('repositorio-content');
            if (!mainContent) return;
            
            mainContent.innerHTML = `
                <div class="swiss-grid">
                    <div class="col-full">
                        <div class="info-box" style="border-color: #e8632e;">
                            <p style="margin: 0;">
                                <strong><i class="fas fa-exclamation-triangle"></i> Erro ao carregar documentos</strong><br>
                                Não foi possível conectar ao sistema de documentos. Por favor, tente novamente mais tarde.
                            </p>
                        </div>
                    </div>
                </div>
            `;
            
            console.error('Detalhes do erro:', error);
        }
    };

    // ========================================
    // INICIALIZAÇÃO
    // ========================================
    
    function init() {
        // Verificar se estamos na página de repositório
        if (document.getElementById('repositorio-content')) {
            console.log('🚀 Inicializando sistema de repositório dinâmico...');
            RepositorioRenderer.render();
        }
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
    
    window.CENIRepositorio = {
        refresh: function() {
            CacheManager.clear();
            RepositorioRenderer.render();
        },
        clearCache: function() {
            CacheManager.clear();
            console.log('✅ Cache limpo com sucesso');
        }
    };

})();
