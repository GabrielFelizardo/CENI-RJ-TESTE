/**
 * CENI-RJ - Sistema de Repositório Dinâmico
 * Versão Apps Script - Cliente JavaScript
 * 
 * Este módulo consome dados do Google Apps Script ao invés da API Sheets diretamente,
 * eliminando a necessidade de expor uma API Key no código cliente.
 * 
 * @author Gabriel Felizardo da Silva
 * @version 2.0 - Apps Script Edition
 * @date Dezembro 2025
 */

(function() {
    'use strict';

    // ========================================================================
    // CONFIGURAÇÃO
    // ========================================================================
    
    const CONFIG = {
        // URL do Web App do Apps Script (será fornecida após implantação)
        APPS_SCRIPT_URL: 'COLE_AQUI_A_URL_DO_SEU_WEB_APP',
        
        // Configurações de cache local
        CACHE_KEY: 'ceni_repositorio_cache',
        CACHE_EXPIRATION: 5 * 60 * 1000, // 5 minutos em milissegundos
        
        // Categorias válidas do repositório
        CATEGORIAS: {
            'Documentos Institucionais': {
                icone: '📋',
                ordem: 1
            },
            'Atas de Reunião': {
                icone: '📝',
                ordem: 2
            },
            'Relatórios e Estudos': {
                icone: '📊',
                ordem: 3
            },
            'Materiais de Apoio': {
                icone: '📚',
                ordem: 4
            }
        },
        
        // Status e seus ícones
        STATUS_ICONES: {
            'Disponível': '✅',
            'Em Breve': '⏳',
            'Em Elaboração': '✏️',
            'Em Desenvolvimento': '🔧',
            'Em Construção': '🚧'
        }
    };

    // ========================================================================
    // GERENCIAMENTO DE CACHE
    // ========================================================================
    
    const CacheManager = {
        /**
         * Salva dados no cache local com timestamp
         */
        salvar(dados) {
            try {
                const cache = {
                    dados: dados,
                    timestamp: Date.now()
                };
                localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(cache));
                console.log('[Cache] Dados salvos com sucesso');
            } catch (erro) {
                console.warn('[Cache] Não foi possível salvar cache:', erro);
            }
        },
        
        /**
         * Busca dados do cache se não expirados
         */
        buscar() {
            try {
                const cacheStr = localStorage.getItem(CONFIG.CACHE_KEY);
                if (!cacheStr) {
                    console.log('[Cache] Cache vazio');
                    return null;
                }
                
                const cache = JSON.parse(cacheStr);
                const idade = Date.now() - cache.timestamp;
                
                if (idade > CONFIG.CACHE_EXPIRATION) {
                    console.log('[Cache] Cache expirado');
                    this.limpar();
                    return null;
                }
                
                console.log(`[Cache] Dados recuperados (idade: ${Math.round(idade / 1000)}s)`);
                return cache.dados;
                
            } catch (erro) {
                console.warn('[Cache] Erro ao buscar cache:', erro);
                return null;
            }
        },
        
        /**
         * Remove cache local
         */
        limpar() {
            try {
                localStorage.removeItem(CONFIG.CACHE_KEY);
                console.log('[Cache] Cache limpo');
            } catch (erro) {
                console.warn('[Cache] Erro ao limpar cache:', erro);
            }
        }
    };

    // ========================================================================
    // COMUNICAÇÃO COM APPS SCRIPT
    // ========================================================================
    
    const AppsScriptAPI = {
        /**
         * Busca dados de uma aba específica do Apps Script
         */
        async buscarAba(nomeAba) {
            if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'COLE_AQUI_A_URL_DO_SEU_WEB_APP') {
                throw new Error('URL do Apps Script não configurada. Configure a URL no código.');
            }
            
            const url = `${CONFIG.APPS_SCRIPT_URL}?aba=${nomeAba}`;
            
            console.log(`[API] Buscando dados da aba: ${nomeAba}`);
            
            const resposta = await fetch(url);
            
            if (!resposta.ok) {
                throw new Error(`Erro HTTP: ${resposta.status}`);
            }
            
            const json = await resposta.json();
            
            if (!json.sucesso) {
                throw new Error(json.erro || 'Erro desconhecido ao buscar dados');
            }
            
            console.log(`[API] Dados recebidos: ${json.dados.length} itens`);
            return json.dados;
        },
        
        /**
         * Busca dados de todas as abas de uma vez
         */
        async buscarTodas() {
            if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'COLE_AQUI_A_URL_DO_SEU_WEB_APP') {
                throw new Error('URL do Apps Script não configurada. Configure a URL no código.');
            }
            
            const url = `${CONFIG.APPS_SCRIPT_URL}?todas=true`;
            
            console.log('[API] Buscando todas as abas');
            
            const resposta = await fetch(url);
            
            if (!resposta.ok) {
                throw new Error(`Erro HTTP: ${resposta.status}`);
            }
            
            const json = await resposta.json();
            
            if (!json.sucesso) {
                throw new Error(json.erro || 'Erro desconhecido ao buscar dados');
            }
            
            console.log('[API] Todas as abas recebidas');
            return json.dados;
        }
    };

    // ========================================================================
    // RENDERIZAÇÃO DO REPOSITÓRIO
    // ========================================================================
    
    const RepositorioRenderer = {
        /**
         * Renderiza o repositório completo no DOM
         */
        renderizar(documentos) {
            const container = document.getElementById('repositorio-content');
            
            if (!container) {
                console.error('[Render] Elemento #repositorio-content não encontrado');
                return;
            }
            
            // Agrupa documentos por categoria
            const grupos = this.agruparPorCategoria(documentos);
            
            // Renderiza cada categoria
            let html = '';
            for (const [categoria, docs] of Object.entries(grupos)) {
                html += this.renderizarCategoria(categoria, docs);
            }
            
            container.innerHTML = html;
            console.log('[Render] Repositório renderizado com sucesso');
        },
        
        /**
         * Agrupa documentos por categoria mantendo a ordem configurada
         */
        agruparPorCategoria(documentos) {
            const grupos = {};
            
            // Inicializa grupos vazios na ordem correta
            const categoriasOrdenadas = Object.entries(CONFIG.CATEGORIAS)
                .sort((a, b) => a[1].ordem - b[1].ordem)
                .map(([nome]) => nome);
            
            for (const categoria of categoriasOrdenadas) {
                grupos[categoria] = [];
            }
            
            // Agrupa documentos
            for (const doc of documentos) {
                if (doc.Categoria && grupos.hasOwnProperty(doc.Categoria)) {
                    grupos[doc.Categoria].push(doc);
                }
            }
            
            // Ordena documentos dentro de cada categoria
            for (const categoria in grupos) {
                grupos[categoria].sort((a, b) => (a.Ordem || 999) - (b.Ordem || 999));
            }
            
            return grupos;
        },
        
        /**
         * Renderiza uma categoria com seus documentos
         */
        renderizarCategoria(categoria, documentos) {
            if (documentos.length === 0) {
                return ''; // Não renderiza categorias vazias
            }
            
            const icone = CONFIG.CATEGORIAS[categoria]?.icone || '📄';
            
            let html = `
                <div class="repo-categoria">
                    <h3 class="categoria-titulo">
                        <span class="categoria-icone">${icone}</span>
                        ${categoria}
                    </h3>
                    <div class="documentos-lista">
            `;
            
            for (const doc of documentos) {
                html += this.renderizarDocumento(doc);
            }
            
            html += `
                    </div>
                </div>
            `;
            
            return html;
        },
        
        /**
         * Renderiza um documento individual
         */
        renderizarDocumento(doc) {
            const statusIcone = CONFIG.STATUS_ICONES[doc.Status] || '❓';
            const disponivel = doc.Status === 'Disponível' && doc.Link;
            
            let html = `
                <div class="documento-item ${disponivel ? 'disponivel' : 'indisponivel'}">
                    <div class="documento-header">
                        <h4 class="documento-titulo">${doc.Título || 'Sem título'}</h4>
                        <span class="documento-status" title="${doc.Status}">
                            ${statusIcone} ${doc.Status}
                        </span>
                    </div>
            `;
            
            if (doc.Descrição) {
                html += `<p class="documento-descricao">${doc.Descrição}</p>`;
            }
            
            if (doc.Data) {
                html += `<p class="documento-data">📅 ${this.formatarData(doc.Data)}</p>`;
            }
            
            if (disponivel) {
                html += `
                    <a href="${doc.Link}" 
                       class="documento-download" 
                       target="_blank" 
                       rel="noopener noreferrer">
                        ⬇️ Baixar Documento
                    </a>
                `;
            }
            
            html += `</div>`;
            
            return html;
        },
        
        /**
         * Formata data para exibição
         */
        formatarData(data) {
            if (!data) return '';
            
            // Se já for string em formato ISO
            if (typeof data === 'string') {
                const partes = data.split('-');
                if (partes.length === 3) {
                    return `${partes[2]}/${partes[1]}/${partes[0]}`;
                }
                return data;
            }
            
            return data;
        },
        
        /**
         * Exibe mensagem de lista vazia
         */
        mostrarVazio() {
            const container = document.getElementById('repositorio-content');
            if (container) {
                container.innerHTML = `
                    <div class="mensagem-vazia">
                        <p>📭 Nenhum documento disponível no momento.</p>
                        <p>Novos documentos serão publicados em breve.</p>
                    </div>
                `;
            }
        },
        
        /**
         * Exibe mensagem de erro
         */
        mostrarErro(mensagem) {
            const container = document.getElementById('repositorio-content');
            if (container) {
                container.innerHTML = `
                    <div class="mensagem-erro">
                        <p>⚠️ Não foi possível carregar o repositório.</p>
                        <p class="erro-detalhe">${mensagem}</p>
                        <button onclick="CENIRepositorio.refresh()" class="btn-retry">
                            🔄 Tentar Novamente
                        </button>
                    </div>
                `;
            }
        }
    };

    // ========================================================================
    // MÓDULO PRINCIPAL
    // ========================================================================
    
    const CENIRepositorio = {
        /**
         * Inicializa o sistema
         */
        async init() {
            console.log('[CENI] Inicializando sistema de repositório dinâmico');
            
            try {
                // Tenta buscar do cache primeiro
                let dados = CacheManager.buscar();
                
                if (!dados) {
                    // Se não tem cache, busca do Apps Script
                    dados = await AppsScriptAPI.buscarAba('repositorio');
                    CacheManager.salvar(dados);
                }
                
                // Renderiza os dados
                if (dados && dados.length > 0) {
                    RepositorioRenderer.renderizar(dados);
                } else {
                    RepositorioRenderer.mostrarVazio();
                }
                
                console.log('[CENI] Sistema inicializado com sucesso');
                
            } catch (erro) {
                console.error('[CENI] Erro na inicialização:', erro);
                RepositorioRenderer.mostrarErro(erro.message);
            }
        },
        
        /**
         * Força atualização dos dados ignorando cache
         */
        async refresh() {
            console.log('[CENI] Forçando atualização de dados');
            CacheManager.limpar();
            await this.init();
        },
        
        /**
         * Limpa cache manualmente
         */
        clearCache() {
            CacheManager.limpar();
            console.log('[CENI] Cache limpo. Recarregue a página para buscar novos dados.');
        }
    };

    // ========================================================================
    // INICIALIZAÇÃO AUTOMÁTICA
    // ========================================================================
    
    // Aguarda o DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CENIRepositorio.init());
    } else {
        CENIRepositorio.init();
    }
    
    // Expõe API pública
    window.CENIRepositorio = CENIRepositorio;
    
    console.log('[CENI] Módulo carregado. API pública disponível em window.CENIRepositorio');

})();
