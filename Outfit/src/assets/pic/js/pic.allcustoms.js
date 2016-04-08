/* Início de novo arquivo concatenado */
(function () {/* Utils */

/*
 * Funções utilitárias do PIC
 * Define, dentro do namespace PIC, funções utilitárias de uso geral.
 */
;(function (PIC, $) {

    'use strict';

    var VERSION = '0.3.0',
        widgets = [],
        activateFunction = {},
        destroyFunction = {};
        
    PIC.version = VERSION;

    /*
     * Funções de teste de largura de tela
     * (associadas ao grid resposivo do Bootstrap)
     */
    PIC.isXS = function (width) {
        return (width < 768);
    };
    PIC.isSM = function (width) {
        return (width >= 768 && width < 992);
    };
    PIC.isMD = function (width) {
        return (width >= 992 && width < 1200);
    };
    PIC.isLG = function (width) {
        return (width >= 1200);
    };

    /*
     * Pega as opções informadas para um widget do PIC
     * Lê o valor do atributo data-pic-name (onde name é o nome do widget) do element, que
     * é o elemento-base do widget.
     * Retorna um objeto JSON contendo as opções
     * Se não houver opções, ou valor do atributo não for um JSON bem formado,
     * retorna um objeto vazio.
     * @TODO Essa função deveria tornar-se privada, pois não é mais para ser usada pelos widgets.
     */
    PIC.getAttrOptions = function (element, name) {

        var attrOptions = {},
            jsonString;

        // Busca o string contido como valor do atributo data-pic-nomedoplugin
        jsonString = element.attr('data-pic-' + name.toLowerCase());

        // Somente se alguma opção tiver sido informada.
        if (jsonString) {

            // O string JSON informado pelo utilizador do plugin, contendo os parâmetros, pode não ser um JSON válido
            try {
                attrOptions = $.parseJSON(jsonString);

            } catch (exception) {

                console.error('Erro ao obter parâmetros do plugin "' + name + '" para o elemento ', element, '\n' +
                              'Os parâmetros informados serão ignorados.\n' +
                              'String JSON mal formado: ', jsonString, '\n' +
                              'Exceção: ', exception);
            }
        }
        return attrOptions;
    };

    /*
     * Reúne as opções vindas de todas as fontes possíveis para o widget
     * Em detalhes, o que a função faz é reunir as opções definidas a) como padrão para o widget;
     * b) via atributo da tag html; c) via instanciação direta por jQuery. Para cada opção,
     * os valors em (c) tem precedência sobre (b), que tem preferência sobre (a).
     * Parâmetros:
     * - element é o elemento base da instância do widget.
     * - name é o nome do plugin, que compõe o nome do atributo (data-pic-name)
     * - options (opcional) são as opções recebidas via instanciação direta por jQuery, sem o uso
     *   das funções auxiliares do PIC. Por exemplo: $('#meuItem').picMeuPlugin( jsonOpcoes )
     * - defaults (opcional) são os valores default definidos para as opções do widget
     * - domains (opcional) são os domínios correspondentes a cada uma das opções
     */
    PIC.collectOptions = function (element, name, options, defaults, domains) {

        var attrOptions;

        attrOptions = PIC.getAttrOptions (element, name);

        options = $.extend(false, {}, defaults, attrOptions, options);

        if ($.type(domains) === 'object' && !$.isEmptyObject(domains)) {
            $.each(domains, function (key) {

                if ($.inArray (options[key], this) === -1) {
                    // options[key] = defaults[key];
                    throw ('O valor informado para o parâmetro "' + key + '" é inválido. ' +
                           'Foi informado: ' + options[key]);
                }
            });
        }
        return options;
    };


    /*
     * Para um JSON em forma de string ou número, transforma em um JSON em forma de objeto.
     * Nesse objeto, a chave é o string ou número, e o valor é sempre true.
     *   'nofilter' >>> { nofilter: true }
     *   123        >>> { 123: true }
     * Para um JSON em forma de array, trata cada posição desse array como um JSON isolado,
     * e faz o mesmo tratamento (ou seja: transforma string e número em objeto; se a posição
     * contiver um array, trata essa posição recursivamente).
     * Para um JSON em qualquer outra forma, não faz nada.
     * O retorno da função pode ser:
     * - um JSON no formato objeto;
     * - um JSON no formato array, cada posição contendo um objeto ou array (que segue essa mesma regra, recursivamente)
     * Veja as formas possíveis de um JSON em http://www.json.org/
     */
    var objectify = function (json) {

        var result;

        // Verifique em que formato está o JSON recebido
        switch ($.type(json)) {

            case 'string':
            case 'number':
                // Transformação "direta" de um string ou número em objeto.
                // 'json' é a chave, e o valor é 'true'.
                result = {};
                result[json] = true;
                break;

            case 'array':
                result = [];
                // Para cada posição de 'json', faz a transformação recursivamente, e grava
                // o resultado na posição equivalente do result.
                $.each(json, function (index) {

                    result[index] = objectify (json[index]);
                });
                break;

            // Se o json recebido não é string, número ou array, não há nada a fazer.
            default:
                result = json;
                break;
        }
        return result;
    }

    /*
     * Para cada elemento interno de uma instância de widget (element) que possua um atributo
     * de configuração, obtém essa configuração, transforma valores simples em objetos,
     * e associa o valor da configuração ao elemento configurado.
     * Transforma (por exemplo):
     * - data-pic-widget-config='nosort' em {nosort: true}
     * - data-pic-widget-config='["nosort", "nofilter"]' em [{nosort: true}, {nofilter: true}]
     * - data-pic-widget-config='{"validate" : "notBlank"}' já é um objeto,
     * O objeto é gravado com o nome picWidgetConfig (onde Widget é o nome do widget ao qual
     * a configuração se refere). Por exemplo: picValidationConfig.
     */
    var buildConfigObjects = function (element, name) {

        // Para cada elemento desse widget que possua configuração
        element.find('[data-pic-' + name.toLowerCase() + '-config]').each(function () {

            var config;

            // Obtém o conteúdo do atributo data-pic-widget-config
            config = $(this).attr('data-pic-' + name.toLowerCase() + '-config');

            // Se o valor informado contém apenas letras, considera como uma configuração
            // que é um string simples (ex: data-pic-datatable-options='nofilter')
            // Nesse caso, envolve o string com aspas duplas, para ser um JSON válido.
            if (/^[a-z]+$/i.test(config)) {
                config = '"' + config + '"';
            }

            try {

                config = $.parseJSON(config);

                // Se não for um objeto, config tem que ser transformado em um.
                // Isso torna o objeto de configuração mais genérico, e é o formato esperado
                // pela extensão do jQuery .filterByConfig().
                if ($.type(config) !== 'object') {

                    config = objectify(config);
                }

                // Associa o objeto de configuração gerado ao elemento configurado.
                $(this).config(name, config);

            } catch (exception) {

                console.error('Erro ao obter configuração relativa ao plugin "' + name + '" para o elemento ', $(this), '\n' +
                              'A configuração será ignorada.\n' +
                              'String JSON mal formado: ', config, '\n' +
                              'Exceção: ', exception);
            }
        });
    };

    var unbuildConfigObjects = function (element, name) {

        // Para cada elemento desse widget que possua configuração
        element.find('[data-pic-' + name.toLowerCase() + '-config]').each(function () {

            $(this).removeConfig(name);
        });
    };

    /*
     * Com base no nome do widget e no contexto em que ele será aplicado, retorna a lista
     * de elementos correspondentes ao widget nomeado.
     * - name: Nome do widget, conforme registro no PIC (obrigatório)
     * - context: Elemento da página a partir do qual a busca será feita (opcional)
     *            O próprio context é incluído na busca
     *            Pode ser informado em forma da seletor, elemento DOM ou objeto jQuery
     * - force: Usado para 'widgets' que não exigem a marca data-pic-nomedowidget.
     *          Se setado como true, o name é desconsiderao e context é retornado.
     */
    var getWidgetsElements = function (name, context, force) {

        var elements,
            selector = '[data-pic-' + name.toLowerCase() + ']';
            
        if (force) {
            // Não olha para o atributo data-pic-<widget>, forçando a ativação do widget 
            // no elemento indicado em context.
            elements = $(context);
        }
        else if (!context) {
            // Se o contexto não foi informado, pega todos os elementos que 
            // casem com o  seletor data-pic-<widget>
            elements = $(selector);
        }
        else if (typeof context === 'string') {
            // Se o contexto foi informado como string, assume que esse string representa
            // um selector jQuery. Busca todos os elementos a partir de context
            // (inclusive ele mesmo, daí o uso do addBack()), que casem com
            // o selector data-pic-<widget>
            elements = $(context).find(selector).addBack().filter(selector);
        }
        else if (context instanceof jQuery) {
            // Se o contexto foi informado como um objeto jQuery, Busca todos os elementos
            // a partir de context, como feito no trecho acima.
            elements = context.find(selector).addBack().filter(selector);
        }
        // Retornará undefined se nenhuma das condições anteriores for atendida.
        // @TODO Essa função pode ser ampliada para tratar a situação em que um elemento do DOM é passado como contexto.
        return elements;
    };

    /*
     * pluginRegister
     * Registra um plugin do PIC
     * Parâmetros:
     * - name: nome do plugin com inicial maiúscula (ex.: Localnav)
     * - classRef: a classe que implementa o plugin.
     */
    PIC.pluginRegister = function (name, classRef) {

        var dataObjName = 'pic' + name + 'Obj';

        console.info ('Registrando widget "' + name + '"');

        // Armazena o nome do widget
        widgets.push (name);

        // Armazena função de ativação no objeto activateFunction
        activateFunction[name] = function (elements, options) {

            var activeAttr = 'data-pic-active',
                object;

            // Tenta ativar o widget para cada element
            $.each(elements, function (index, element) {

                // Aborta silenciosamente a ativação caso o element já tenha sido ativado antes.
                if (element.hasAttribute(activeAttr)) {
                    return;
                }

                element = $(element);

                // A instanciação está sujeita a erros em tempo de execução por ser um processo genérico.
                try {
                    // Cria os objetos de configuração dos elementos internos.
                    buildConfigObjects(element, name);
                    // Instancia o objeto
                    object = new classRef (element, name, options);
                    // Guarda referência do objeto no element
                    element.data(dataObjName, object);
                    // Marca do fim da ativação
                    element.attr(activeAttr, '');
                    // Avisa sobre a ativação
                    console.info('"' + name + '" ativado para o elemento', element);
                }
                catch (exception) {

                    console.error('Erro ao criar instância do widget "' + name + '" para o elemento ', element, ': ', exception);
                    if (exception.stack) {
                        console.debug(exception.stack);
                    } else {
                        console.info('Utilize um navegador mais moderno para visualizar a pilha de exceção.');
                    }
                }
            });
        };

        // Armazena a função de destruição no objeto destroyFunction
        destroyFunction[name] = function (elements) {

            var activeAttr = 'data-pic-active';

            // Tenta destruir o widget para cada element
            $.each(elements, function (index, element) {

                // Aborta silenciosamente a destruição caso o element não esteja ativo.
                // element[0] retorna o elemento DOM equivalente ao objeto jQuery (hasAttribute é função nativa do javascript).
                if (!element.hasAttribute(activeAttr)) {
                    return;
                }

                element = $(element);

                // Destruir os objetos de configuração dos elementos internos.
                unbuildConfigObjects(name);
                // Destrói instancia o objeto
                element['pic' + name]().destroy();
                // Apaga referência do objeto no element
                element.removeData(dataObjName);
                // Marca do fim da ativação
                element.removeAttr(activeAttr);
                // Avisa sobre a ativação
                console.info('"' + name + '" destruído para o elemento', element);
            });
        };

        // Extensão do jQuery
        // Cria um plugin jQuery com o nome no padrão 'picName' (como picGlobalnav)
        $.fn['pic' + name] = function () {

            // Retorna o objeto armazenado na criação
            // Caso o seletor refira-se a mais de um elemento, retorna apenas o objeto do primeiro.
            return this.first().data(dataObjName);;
        };
        
        // Extensão do PIC
        // Se a classe referente ao widget possuir métodos estáticos,
        // para cada um desses métodos:
        $.each(classRef, function (methodName, method) {
            
            // Estende o PIC, criando uma propriedade que é 
            // um objeto (inicialmente vazio)
            // de mesmo nome que a class/widget sendo registrada.
            PIC[name] = PIC[name] || {};
            // Cria dentro desse objeto uma referência ao método
            // estático da classe.
            PIC[name][methodName] = method;
        });
    };

    /*
     * activateWidget
     * Parâmetros:
     * - name: nome do plugin com inicial maiúscula (ex.: Localnav)
     * - context: contexto onde será aplicada a ativação (opcional)
     * - options: opções que podem ser passadas para o widget (opcional)
     *            (é semelhante ao que é passado por meio do valor do atributo data-pic-nomenowidget)
     * - force: desconsidera a necessidade do atributo data-pic-nomedowidget, e usa o parâmetro
     *          context como seletor (não faz parte da API pública do PIC).
     */
    PIC.activateWidget = function (name, context, options, force) {

        var elements;

        elements = getWidgetsElements(name, context, force);

        if (elements === undefined) {
            console.warn ('PIC.activateWidget: "' + name + '": não ativado. Verifique se o valor informado para "context" é válido: ', context);
        } else if (typeof activateFunction[name] !== 'function') {
            console.warn ('PIC.activateWidget: "' + name + '" parece não ter sido registrado. Ativação abortada.');
        } else {
            activateFunction[name](elements, options);
        }
    };

    PIC.destroyWidget = function (name, context) {

        var elements;

        elements = getWidgetsElements(name, context);

        if (elements === undefined) {
            console.warn ('PIC.destroyWidget: "' + name + '": não destruído. Verifique se o valor informado para "context" é válido: ', context);
        } else if (typeof activateFunction[name] !== 'function') {
            console.warn ('PIC.destroyWidget: "' + name + '" parece não ter sido registrado. Destruição abortada.');
        } else {
            destroyFunction[name](elements);
        }
    }

    PIC.activateAllWidgets = function (context) {

        $(widgets).each(function (index, name) {
            PIC.activateWidget(name, context);
        });
    };

    PIC.destroyAllWidgets = function (context) {

        $(widgets).each(function (index, name) {
            PIC.destroyWidget(name, context);
        });
    };

})(window.PIC = window.PIC || {}, jQuery);


/*
 * Extensão do jQuery
 * Isso foi extraído diretamente do código do jQueryUI,
 * aproveitando apenas o estritamente necessário para o nosso caso,
 * ou seja: uniqueId e removeUniqueId.
 * Foi modificado somente o formato: de ui-id-* para pic-id-*
 */
;(function ($) {

    $.fn.extend({

        uniqueId: (function() {
            var uuid = 0;

            return function() {
                return this.each(function() {
                    if ( !this.id ) {
                        this.id = "pic-id-" + ( ++uuid );
                    }
                });
            };
        })(),

        removeUniqueId: function() {
            return this.each(function() {
                if ( /^pic-id-\d+$/.test( this.id ) ) {
                    $( this ).removeAttr( "id" );
                }
            });
        }
    });

})(jQuery);


/*
 * Extensão do jQuery
 * Código utilitário do PIC, que precisou se escrito como extensão do jQuery para valer-se
 * do esquema de encadeamento fornecido por ele.
 * Separado do bloco de extensão anterior por conter código produzido pela equipe do PIC.
 */
;(function ($) {

    $.fn.extend({

        /*
         * Reduz o conjunto de elementos para aqueles que possuem a configuração informada.
         * Dado um objeto jQuery que representa um conjunto de elementos DOM, o método
         * constrói um novo objeto jQuery a partir de um subconjunto de elementos cuja configuração
         * corresponde ao especificado.
         *
         * Assinaturas:
         * .filterByConfig (widgetName)
         *  Retorna os elementos que possuam configuração relativa a esse widget.
         *
         * .filterByConfig (widgetName, param)
         *  Retorna os elementos que possuam o parâmetro 'param' informado na configuração
         *  relativa a esse widget.
         *
         * .filterByConfig (widgetName, param, expectedValue)
         *  Retorna os elementos cujo parâmetro 'param' informado na configuração
         *  relativa a esse widget possua o valor 'expectedValue'.
         */
        filterByConfig: function (widgetName, param, expectedValue) {

            /*
             * Percorre o objeto informado, retornando true se encontrar o que procura, que pode ser:
             * - se 'expectedValue' for informado, a existência da chave 'param' associada ao valor 'expectedValue'.
             * - se 'expectedValue' não for informado, a mera existência da chave 'param'.
             * O objeto a ser percorrido pode ser:
             * - um objeto "simples";
             * - um array de objetos;
             * - um objeto contendo arrays;
             * - a combinação dessas possibilidades (viva a recursividade!)
             */
            var find = function (objConfig, param, expectedValue) {

                // A princípio, não encontrou nada.
                var found = false;

                // Se estivermos tratando de um array
                if ($.type(objConfig) === 'array') {

                    // Para cada posição do array
                    $.each(objConfig, function (index, itemConfig) {
                        // Faz a busca na posição atual do array.
                        found = find(itemConfig, param, expectedValue);
                        // Se o que se está buscando foi encontrado,
                        // força a saída do loop each (não precisa continuar buscando).
                        if (found) return false;
                    });

                // Se não estivermos tratando de um array, é um objeto "simples".
                } else {

                    // Se não foi informado um valor específico
                    if (expectedValue === undefined) {
                        // found recebe true se a chave existe no objeto.
                        found = (objConfig[param] !== undefined);

                    // Se foi informado um valor específico
                    } else {
                        // found recebe true se a chave (além de existir) está associada ao valor informado.
                        found = (objConfig[param] === expectedValue);
                    }
                }
                // Retorna true se encontrou o que se buscava.
                return found;
            };

            /*
             * FilterByConfig usa o método 'filter' do jQuery, passando como parâmetro
             * a função que filtra de acordo com a configuração desejada.
             * O retorno de FilterByConfig é justamente o retorno de filter.
             * Isso quer dizer que a extensão filterByConfig pode ser vista simplesmente
             * como uma chamada a filter(), passando como parâmetro a função aqui definida.
             */
            return this.filter(function () {

                var objConfig;

                // Obtém o objeto de configuração com a configuração correspondente ao widget.
                objConfig = $(this).config(widgetName);

                // Se existir a configuração para o widget
                if (objConfig) {

                    // Se foi informado um parâmetro específico
                    if (param !== undefined) {

                        // Se expectedValue for informado, retorna true se o parâmetro existe e corresponde a esse valor.
                        // Se expectedValue não for informado, retorna true se o parâmetro existe.
                        return find(objConfig, param, expectedValue);

                    // Se não foi informado um parâmetro específico, o que se quer testar é se
                    // apenas a configuração existe. Como existe (já foi testado!), retorna true.
                    } else {

                        return true;
                    }

                // Se não existir objeto de configuração, retorna false.
                } else {

                    return false;
                }
            });
        },

        /*
         * Funciona da mesma forma como o método 'data()' do jQuery.
         * A especificidade aqui é que o primeiro parâmetro (widgetName) não deve ser entendido
         * como um valor genérico mas, sim, como o nome de um widget do PIC; além disso, esse
         * nome é complementado com outro string antes de ser usado para armazenamento.
         */
        config: function (widgetName, value) {

            if (value === undefined) {
                // Retorna um valor específico
                return this.data(widgetName + 'Config');
            } else {
                // Retorna o objeto chamador, permitindo o encadeamento (ver documentação do data())
                return this.data(widgetName + 'Config', value);
            }
        },

        removeConfig: function (widgetName) {

            return this.removeData(widgetName + 'Config');
        }
    });
})(jQuery);


;(function () {

    'use strict';

    // Lista de teclas úteis
    key = {
        'backspace': 8,
        'tab': 9,
        'enter': 13,
        'shift': 16,
        'ctrl': 17,
        'alt': 18,
        'pause': 19,
        'capslock': 20,
        'esc': 27,
        'pageup': 33,
        'pagedown': 34,
        'end': 35,
        'home': 36,
        'left': 37,
        'up': 38,
        'right': 39,
        'down': 40,
        'insert': 45,
        'delete': 46,
        '0': 48,
        '1': 49,
        '2': 50,
        '3': 51,
        '4': 52,
        '5': 53,
        '6': 54,
        '7': 55,
        '8': 56,
        '9': 57,
        'a': 65,
        'b': 66,
        'c': 67,
        'd': 68,
        'e': 69,
        'f': 70,
        'g': 71,
        'h': 72,
        'i': 73,
        'j': 74,
        'k': 75,
        'l': 76,
        'm': 77,
        'n': 78,
        'o': 79,
        'p': 80,
        'q': 81,
        'r': 82,
        's': 83,
        't': 84,
        'u': 85,
        'v': 86,
        'w': 87,
        'x': 88,
        'y': 89,
        'z': 90,
        '0numpad': 96,
        '1numpad': 97,
        '2numpad': 98,
        '3numpad': 99,
        '4numpad': 100,
        '5numpad': 101,
        '6numpad': 102,
        '7numpad': 103,
        '8numpad': 104,
        '9numpad': 105,
        'multiply': 106,
        'plus': 107,
        'minut': 109,
        'dot': 110,
        'slash1': 111,
        'F1': 112,
        'F2': 113,
        'F3': 114,
        'F4': 115,
        'F5': 116,
        'F6': 117,
        'F7': 118,
        'F8': 119,
        'F9': 120,
        'F10': 121,
        'F11': 122,
        'F12': 123,
        'equal': 187,
        'coma': 188,
        'slash': 191,
        'backslash': 220
    };
})(window.key = window.key || {});

})();
/* Início de novo arquivo concatenado */
(function () {/* Bootstrap */
/* Corrige o comportamento navbar-toggle em telas pequenas */
var dataTargetShow, $prevNavBarToggle = {};
$(".navbar-toggle").click(function(){
	var $navBarToggle = $(this);
	
	if($.isEmptyObject($prevNavBarToggle) !== true){
		$prevNavBarToggle.removeClass("active");
	}
	
	$navBarToggle.addClass("active");	
	$(dataTargetShow).collapse('hide');
	
	var dataTarget = $(this).attr("data-target");
	$(dataTarget).collapse('show');
	dataTargetShow = dataTarget;
	$prevNavBarToggle = $(this);
});
/* --- */

})();
/* Início de novo arquivo concatenado */
(function () {/* Modal */
/**
Transforma um bloco de conteúdo em uma janela modal.

Ordem de execução ao clicar no botão de confirmação (para dialog=confirm):

1. A janela modal dispara o evento pic:confirm. Você pode criar um listener para esse evento. Se o retorno do listener for `false`, a execução é interrompida.
2. Se o parâmetro `callback` tiver sido informado, a função é executada. Se o retorno do callback for `false`, a execução é interrompida.
3. Se o parâmetro `formId` tiver sido informado, o formulário correspondente é submetido.


##### Configuração interna

- `noclose`:
  Se forem criados botões personalizados, determina que o botão com essa configuração não feche automaticamente da modal.

@module Modal
@attribute data-pic-modal
@param {string} title - Título da janela modal.
@param {string} [dialog=default] - Define o diálogo desejado. Valores possíveis: default|confirm|alert.
@param {string} [type=default] - Define o tipo de modal desejado. Valores possíveis: 
 - para dialog=default: nenhum (não se aplica)
 - para dialog=confirm: default|warning
 - para dialog=alert: default|info|success|warning|error
@param {string} [size=sm] - Define a largura da modal desejada. Valores possíveis: 
sm|md|lg
Utilizado apenas se dialog=confirm.
@param {string} [callback.name] - Nome da função javascript que será executada ao confirmar. Utilizado apenas se dialog=confirm.
@param {string} [callback.params] - Parâmetro da função javascript que será executada ao confirmar. Se houver mais de um parâmetro, informe cada um como elemento de um array, como: [1, 2, 3]. Utilizado apenas se dialog=confirm.
@param {string} [formId] - Atributo `id` do formulário que será submetido ao confirmar. Utilizado apenas se dialog=confirm
@fires pic:confirm
@example

<!-- O botão que dispara (abre) o modal. Atente para o atributo data-target -->
<button data-toggle="modal" data-target="#meuModal">Mostrar</button>

<!-- O modal em si -->
<div data-pic-modal='{"title": "Exemplo de modal"}' id="meuModal">
    <p>Conteúdo do modal</p>
</div>

...

<!-- Outro modal -->
<div data-pic-modal='{"title": "Exemplo de modal com meus botões"}' id="meuModalBotoes">
    <p>Conteúdo do modal</p>
    <div class="buttons">
        <button data-pic-modal-config='noclose'>Confirmar</button>
    </div>
</div>

*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Definição da classe
     */
    var Modal = function (element, name, jsOptions) {

        /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var defaults,
            domains,
            options,
            modalContent,
            modalClass,
            titleId,
            lastFocused;

        /*
         * Valores default das opções do plugin
         */
        defaults = {
            title: 'Mensagem da página',
            dialog:  'default',
            type: 'default',
			size: 'sm',
            callback: {}
        };

        /*
         * Domínios
         */
        domains = {
            dialog: ['default', 'confirm', 'alert'],
            type: ['default', 'info', 'success', 'warning', 'error'],
			size: ['sm', 'md', 'lg']
        }

        /*
         * Colecionando as opções do plugin
         */
        options = PIC.collectOptions(element, name, jsOptions, defaults, domains);

        /*
         * Métodos públicos
         * São chamados de dentro da classe: this.metodoPublico()
         * São chamados externamente: umaInstancia.metodoPublico()
         */

        // Mostra o modal
        this.show = function () {
            // Armazena o elemento que estava com foco exatamente antes de o modal ser aberto
            lastFocused = document.activeElement;
            element.modal('show');
        };

        // Esconde (fecha) o modal
        this.hide = function () {
            element.modal('hide');
        };

        // Alterna a visibilidade do modal (mostra/esconde)
        this.toggle = function () {
            // Se não tem armazenado o elemento que estava com foco exatamente antes de o modal ser
            // aberto, armazena esse elemento (certamente, o modal está sendo aberto agora, não fechado)
            if (!lastFocused) {
                lastFocused = document.activeElement;
            }
            element.modal('toggle');
        };

        /*
         * Métodos privados
         * São chamados apenas de dentro da classe: metodoPrivado()
         */

        // Executa assim que o modal é escondido (fechado).
        var onHidden = function () {
            // Se havia sido armazenado o último elemento com foco,
            // devolve o foco para ele, e deixa-o novamente indefinido.
            // Todo o tratamento feito com a variável lastFocused faz sentido apenas para modal
            // aberto programaticamente, ou seja, via chamada dos métodos show() e toggle().
            // Quando o desenvolvedor associa via atributos um botão a um modal, o próprio widget
            // do Bootstrap faz esse tratamento de foco.
            if (lastFocused) {
                $(lastFocused).focus();
                lastFocused = undefined;
            }
        };

        // Executa no clique do botão de confirmação (modal confirm)
        var clickConfirm = function (e) {

            var callback,
                result;

            // O parâmetro "true" passado para triggerHandler indica que o botão de confirmação foi pressionado
            // Se o handler do evento 'pic:confirm' retornar false, aborta a execução
            result = element.triggerHandler('pic:confirm', true);
            if (result === false) {
                return;
            }

            // Se foi informada uma função de callback...
            if (typeof options.callback.name !== 'undefined') {

                callback = window[options.callback.name];

                // ... e ele é mesmo uma função
                if (typeof callback === 'function') {

                    // Executa a função de callback
                    result = callback.apply (this, options.callback.params);

                    // Se essa função de callback retornar false, aborta a execução
                    if (result === false) {
                        return;
                    }
                // O nome informado não corresponde a uma função
                } else {
                    console.warn ('Modal: "' + options.callback.name + '" não é uma função (callback.name).');
                }
            }

            // Se o formulário indicado existe, faz o submit
            if ($('#' + options.formId).length) {
                $('#' + options.formId).submit();
            }

            // Fecha o modal
            element.modal('hide');
        };

        // Executa no clique do botão de cancelamento (modal confirm)
        var clickCancel = function (e) {

            var result;

            // O parâmetro "false" passado para triggerHandler indica que o botão de cancelamento foi pressionado
            // Se o handler do evento 'pic:confirm' retornar false, aborta a execução
            result = element.triggerHandler('pic:confirm', false);
            if (result === false) {
                return;
            }

            // Fecha o modal
            element.modal('hide');
        };

        var defineModalClass = function (dialog, type, size) {

            var classes,
                typeMap = {
                    'default': '',
                    'info':    'info',
                    'success': 'sucesso',
                    'warning': 'advertencia',
                    'error':   'erro'
                };
                
            classes = ['modal-dialog'];

            switch (dialog) {

                case 'alert':
                    classes.push('modal-sm', 'alertBox');
                    classes.push(typeMap[type]);
                    break;

                case 'confirm':
                    classes.push('modal-' + size, 'alertBox');
                    if (type === 'warning') {
                        classes.push(typeMap[type]);
                    }
                    break;

                case 'default':
                    classes.push('modal-lg');
                    break;
            }
            return classes.join(' ');
        };
        
        // Solicita a criação dos botões do modal, conforme o diálogo
        var createButtons = function (dialog) {

            switch (dialog) {
                case 'alert':   createAlertButtons();   break;
                case 'confirm': createConfirmButtons(); break;
                case 'default': createDefaultButtons(); break;
            }
        }

        // Cria os botões do diálogo alert
        var createAlertButtons = function () {
            element.find('.modal-content').append('<div class="modal-footer"></div>');
            element.find('.modal-footer').append('<button type="button" class="btn btn-default" data-dismiss="modal">Fechar</button>');
        }

        // Cria os botões do diálogo confirm
        var createConfirmButtons = function () {

            var buttonLabels = ['Sim', 'Não'];

            if (options.labels) {

                if ($.isArray(options.labels)) {
                    $.extend(true, buttonLabels, options.labels);
                } else {
                    buttonLabels[0] = options.labels;
                }
            }

            element.find('.modal-content').append('<div class="modal-footer"></div>');

            element.find('.modal-footer')
                .append('<button type="button" class="btn btn-sim btn-default">' + buttonLabels[0] + '</button>')
                .append('<button type="button" class="btn btn-nao btn-secondary">' + buttonLabels[1] + '</button>');

            element.find('.btn-sim').on('click', clickConfirm);
            element.find('.btn-nao').on('click', clickCancel);
        };

        // Cria os botões do diálogo default
        var createDefaultButtons = function () {

            var customButtonsWrapper,
                customButtons,
                buttonLabel = 'Fechar';

            customButtonsWrapper = element.find('.modal-body .buttons');

            // Se foram definidos botões personalizados
            if (customButtonsWrapper.length) {

                // Adiciona a classe prevista pelo Bootstrap
                // Destaca os botões de onde eles estão e coloca no final de 'modal-content'
                customButtonsWrapper
                    .addClass('modal-footer')
                    .detach().appendTo( element.find('.modal-content') );

                customButtons = customButtonsWrapper.children();

                // Remove dessa região tudo o que não for botão
                // (é uma restrição mesmo, preço que se paga pela padronização)
                customButtons.not('button').remove();
                // Adiciona as classes previstas pelo Bootstrap
                customButtons.addClass('btn');
                customButtons.filter(':not(.btn-secondary)').addClass('btn-default');
                // Botão fecha a modal, por padrão; a menos que esteja marcado com 'noclose'.
                customButtons.not( customButtons.filterByConfig(name, 'noclose') ).attr('data-dismiss', 'modal');

            // Se não há botões personalizados, cria o botão padrão
            } else {

                // Se há labels personalizados
                if (options.labels) {
                    if ($.isArray(options.labels)) {
                        buttonLabel = options.labels[0];
                    } else {
                        buttonLabel = options.labels;
                    }
                }
                element.find('.modal-content').append('<div class="modal-footer"></div>');
                element.find('.modal-footer').append('<button type="button" class="btn btn-default" data-dismiss="modal">' + buttonLabel + '</button>');
            }
        };

        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         */

        // Classes
        element.addClass("modal fade");

        // Atributos
        element.attr({
            "role":             "dialog",
            "tabindex":         "-1",
            "aria-hidden":      "true",
            "data-keyboard":    "true"
        });

        // Armazena aqui tudo o que está contido no element, e remove do DOM
        modalContent = element.children().detach();
        
        // Define que classe(s) a modal deve possuir, conforme o diálogo e o tipo.
        modalClass = defineModalClass(options.dialog, options.type, options.size);
        element.append('<div class="' + modalClass + '" ></div>');

        // Cria área de conteúdo (cabeçalho, corpo, rodapé)
        element.find('.modal-dialog').append('<div class="modal-content"></div>');
        // Cria área para cabeçalho
        element.find('.modal-content').append('<div class="modal-header"></div>');
        // Insere botão para fechar;
        element.find('.modal-header').append('<button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>');
        // Insere título, fazendo com que ele seja o rótulo do modal (via aria-labelledby)
        element.find('.modal-header').append('<h4 class="modal-title">' + options.title + '</h4>');
        titleId = element.find('.modal-title').uniqueId().attr('id');
        element.attr('aria-labelledby', titleId);
        // Cria área do corpo
        element.find('.modal-content').append('<div class="modal-body"></div>');
        // Reinsere o conteúdo original no corpo
        element.find('.modal-body').append(modalContent);

        // Cria os botões, conforme o tipo.
        createButtons(options.dialog);


        // Eventos
        element.on('hidden.bs.modal', onHidden);
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Modal', Modal);

})(jQuery, window, document);
})();
/* Início de novo arquivo concatenado */
(function () {/* Autocomplete */
/**
Transforma um input de texto em um campo autocomplete.

O URL informado deve apontar para um arquivo JSON contendo um array, cada elemento correspondendo
a uma opção. Ex: `["primeiro", "segundo", "terceiro"]`

@module Autocomplete
@attribute data-pic-autocomplete
@param {URL} source - Indica a localização da fonte de dados para o autocomplete
@example
<input data-pic-autocomplete='{ "source" : "/path/to/names.json" }' type="text" name="nome" />
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     */
    var var1 = 1,
        var2;

    /*
     * Definição da classe
     */
    var Autocomplete = function (element, name, jsOptions) {

        /*
         * Variáveis de instância
         *   Como boa prática, defina aqui todas as variáveis que você vai utilizar na implementação
         *   do plugin. Claro que, se você vai criar funções para organizar seu código, essas 
         *   funções podem ter suas próprias variáveis definidas. Siga sempre a boa prática,
         *   também nessas funções, de definir as variáveis antes de tudo.
         *   As variáveis defaults, domains e options tem relação com os parâmetros que o plugin
         *   que está sendo implementado pode receber. Se ele não recebe parâmetros, nenhuma
         *   dessas variáveis são necessárias.
         */
        var defaults,
            domains,
            options,
            jsonsource,
            container,
            menu;

        /*
         * Valores default das opções do plugin
         *   Como boa prática, defina aqui um valor padrão para cada uma das opções que o plugin
         *   pode receber, ainda que seja 0 para valores numéricos, string vazio para textos,
         *   false para booleanos, etc.
         *   Ao fazer isso, você terá aqui uma lista de todas os parâmetros que seu plugin pode
         *   receber, e terá um código auto-documentado.
         */
        defaults = {
            type: 'suggestion',
    
        };

        /*
         * Domínios
         *   Há alguns parâmetros que devem estar contido em um domínio definido. Isso é o que
         *   deve ser informado aqui. 
         *   Se um parâmetro (chave) está presente nesse objeto, ele deve também estar presente no
         *   objeto 'defaults', e o valor default deve ser um dos valores possíveis.
         *   Se o desenvolvedor informar, para um parâmetro que tenha domínio definido, um valor
         *   fora desse domínio, será lançada uma exceção.
         *   Veja a documentação de PIC.collectOptions() para mais informações.
         */
        domains = {
            type: ['suggestion', 'selection']
        };
        
        /*
         * Colecionando as opções do plugin
         *   Após essa chamada, você terá no objeto 'options' as opções prontas para utilizar
         *   na implementação do plugin.
         *   Como boa prática, você não deve passar esse 'options' para um plugin que estiver
         *   sendo extendido, visto que ele pode conter quaisquer parâmetros que o desenvolvedor
         *   informar. Controle os parâmetros que você vai passar para o plugin que está sendo
         *   extendido usando as chaves específicas correspondentes a cada parâmetro, como
         *   options.opcao1, options.opcao2.
         *   Note que 'defaults' e 'domains' são opcionais, mas para informar 'domains',
         *   é preciso informar também 'defaults'. Assim, são possíveis as chamadas:
         *   - PIC.collectOptions(element, name, jsOptions);
         *   - PIC.collectOptions(element, name, jsOptions, defaults);
         *   - PIC.collectOptions(element, name, jsOptions, defaults, domains);
         *   Essa chamada é necessária apenas se o plugin que está sendo implementado
         *   recebe parâmetros.
         */
        options = PIC.collectOptions(element, name, jsOptions, defaults, domains);
        
        if (options.type == "suggestion") {
            
            // Ao renderizar a lista de opções (exibir a lista na tela),
            var onRender = function () {
                // Seta os atributos necessários para cada opção.
                // O id é necessário para ser usado no atributo aria-activedescendant.
                menu.find('.tt-suggestion')
                    .attr("role", "option")
                    .uniqueId();
            };

            // Ao ocorrer a mudança do cursor entre as opções disponíveis
            var onCursorChange = function () {
                // Se o cursor está em alguma das opções
                if (menu.find('.tt-cursor').length) {
                    // Indica para o element que seu descendente ativo é a opção apontada
                    element.attr('aria-activedescendant', menu.find('.tt-cursor').attr('id'));
                // Se o cursor está no próprio input (ou seja, em nenhuma das opções)
                } else {
                    element.attr('aria-activedescendant', '');
                }
            };

            /*
             * Instanciação do plugin que está sendo estendido (se for o caso).
             */

            jsonsource = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.whitespace,
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                prefetch: options.source
                /*remote: {
                    url: '../infoleg/data/paises.json',
                    rateLimitWait: 1000
                }*/
            });

            // element.find('.typeahead').typeahead({
            element.typeahead({
                minLength: 1,
                highlight: true,
                dynamic: true
            },{
                source: jsonsource,
                limit: 999,
                templates: {
                    empty: [
                        '<div class="empty-message" role="status" aria-live="polite">',
                        'Palavra não encontrada.',
                        '</div>'
                    ].join('\n')}
            });

            /*
             * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
             */

            if (!options.source) {
                console.warn ('Parâmetro "source" não foi informado para o autocomplete. ', element);
            }

            // Container é o elemento criado em volta do input original (element)
            container = element.parent('.twitter-typeahead');
            // Menu é o elemento que contém as opções do autocomplete.
            menu = container.find('tt-menu');

            // Atributos html do container, menu e input (element)
            container.find(".tt-hint")
                .attr("aria-hidden", "true")
                .addClass("form-control");

            menu
                .attr("role", "listbox")
                .uniqueId();

            menu.find('.tt-dataset').attr("role", "presentation");

            element.attr({
                "role": "combobox",
                "aria-autocomplete": "list",
                "aria-owns": menu.attr('id')
            }).addClass("form-control");

            // Eventos do typeahead
            element.on('typeahead:render', onRender);
            element.on('typeahead:cursorchange', onCursorChange);

            element.on('typeahead:open', function () {
                // @TODO aria-expanded=true deveria estar em um lugar melhor do que aqui, já que,
                //       nesse evento, é setado antes que as opções sejam abertas.
                element.attr('aria-expanded', 'true');
            });

            element.on('typeahead:close', function () {
                // @TODO aria-expanded=false deveria estar em um lugar melhor do que aqui, já que,
                //       nesse evento, pode continuar como true ainda que as opções sejam fechadas.
                element.attr('aria-expanded', 'false');
            });
            
        } else {
            alert ("Selection");
        }
        
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Autocomplete', Autocomplete);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Collapsible */
/**
Permite que um conteúdo possa ser recolhido (ocultado) ou exibido ao clicar no título associado

O título deve ser marcado com a classe `collapsibleTitle`.

O conteúdo deve ser marcado com a classe `collapsibleContent`.

@module Collapsible
@attribute data-pic-collapsible
@param {boolean} [collapse=false] - Indica se o conteúdo estará inicialmente recolhido. O padrão é não recolhido (mostrado).
@example
<div data-pic-collapsible>
    <h2 class="collapsibleTitle" tabindex="0">
        Conteúdo adicional
    </h2>
    <div class="collapsibleContent">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    </div>
</div>
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     
        var var1 = 1,
            var2;
        
    */

    /*
     * Tudo o que for necessário executar apenas uma vez, na carga da página
     * deve estar escrito aqui.
     * Se, por exemplo, o plugin que está sendo extendido expõe seus valores default
     * e é necessário modificar algum desses valores de forma geral,
     * isso deve ser feito aqui.
     
        $.fn.pluginOriginal.defaults.opcao = 'novo-valor';
        
     */
    
    /*
     * Definição da classe
     */
    var Collapsible = function (element, name, jsOptions) {

        /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var defaults,
            domains,
            options;

        /*
         * Valores default das opções do plugin
         */
        defaults = {
            collapse: false
        };
        
        /*
         * Domínios
         */
        domains = {
            collapse: [true, false]
        };
        
        /*
         * Colecionando as opções do plugin
         */
        options = PIC.collectOptions(element, name, jsOptions, defaults, domains);
        
        /*
         * Métodos públicos
         * São chamados de dentro da classe: this.metodoPublico()
         * São chamados externamente: umaInstancia.metodoPublico()
         
            this.metodoPublico = function (p1, p2) {

            };
        
        */

        /*
         * Métodos privados
         * São chamados apenas de dentro da classe: metodoPrivado()
         
            var metodoPrivado = function (p1, p2) {

            };
        
        */
        
        /*
         * Instanciação do plugin que está sendo estendido (se for o caso).
         
            element.collapse(options);        
        */

        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         
            element.addClass('minhaClasse');
            element.click(function () {
                element.toggleClass('classeDinamica');
            });
        */
        
        var title = element.find(".collapsibleTitle");
        var content = element.find(".collapsibleContent");
        
        /* Insere dinamicamente os ids no Title e Content */
        title.uniqueId();        
        var idTitle;
        idTitle = title.attr("id");
        
        content.uniqueId();
        var idContent;
        idContent = content.attr("id");
        
        /* Insere os parâmetros necessários para o funcionamento do Collapsible */
        title.attr("data-toggle", "collapse");
        title.attr("data-target", "#"+idContent);
        
        /* Inserção dos parâmetros WAI-ARIA */
        if (options.collapse) {
            title.attr("aria-expanded","false");
            content.addClass("collapse");
            
            title.attr("aria-hidden","true");
            content.attr("aria-hidden","true");
            
            title.addClass("closed");
        } else {
            title.attr("aria-expanded","true");
            content.addClass("collapse in");
            
            title.attr("aria-hidden","false");
            content.attr("aria-hidden","false");
            
            title.addClass("opened");
        }
                
        title.attr("role", "tab");
        title.attr("aria-controls", idContent);
        title.attr("tabindex", 0);
        title.attr("aria-controls",idContent);
        content.attr("aria-labelledby", idTitle);
        content.attr("role", "tabPanel");
        
        /* Função que realiza a mudança de posicionamento das setas no Title */
        function collapseArrow() {
            if ( title.attr("aria-expanded") == "true" ) {
                title.removeClass("opened");
                title.addClass("closed");
                
                title.attr("aria-hidden", "false");
            } else {
                title.removeClass("closed");
                title.addClass("opened");
                
                title.attr("aria-hidden", "true");
            }
        }
        
        /* Realiza a mudança de posicionamento das setas no Title */
        title.on( "click", function() {
            collapseArrow();
        });
        
        /* Aciona o Collapsible através do Enter */
        title.keydown(function(e){
            if (e.keyCode == key.enter) {
                title.trigger("click");
            }
        });       
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Collapsible', Collapsible);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Tooltip */
/**
Adiciona informações adicionais aos elementos marcados com data-pic-tooltip.

@module Tooltip
@attribute data-pic-tooltip
@param {data} text - como valor deve ser inserido o texto a ser renderizado no tooltip.
@param {data} sourceId - utilizado no contexto de HTML rico (complexo) - como valor recebe o id do elemento marcado no HTML que deverá ser renderizado no Tooltip.
@example
<!-- Usando texto simples -->
<span data-pic-tooltip='{"text": "Aqui deve estar o texto do meu Tooltip e eu não quero que ele ajuste o tamanho"}'>Tooltip Texto</span>

<!-- Usando HTML -->
<span data-pic-tooltip='{"sourceId": "tooltipHtml"}'>Tooltip Html</span>
            
<div id="tooltipHtml">
    <b>Texto Negrito</b>
    <h1>Texto Título</h1>
</div>
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     
        var var1 = 1,
            var2;
        
    */

    /*
     * Tudo o que for necessário executar apenas uma vez, na carga da página
     * deve estar escrito aqui.
     * Se, por exemplo, o plugin que está sendo extendido expõe seus valores default
     * e é necessário modificar algum desses valores de forma geral,
     * isso deve ser feito aqui.
     
        $.fn.pluginOriginal.defaults.opcao = 'novo-valor';
        
     */
    
    /*
     * Definição da classe
     */
    var Tooltip = function (element, name, options) {
                
        /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var settings,
            attrOptions,
            text,
            sourceId,
            source;

        /*
         * Valores default, se houver
        */
        settings = {
            text: '',
            sourceId: ''
        };
        
        /*
         * Opções obtidas por meio do valor associado ao atributo que identifica o plugin
         */
        attrOptions = PIC.getAttrOptions (element, name);

        /*
         * Extensão de options: passa a ser o 'merge' entre settings (fixo) e options (parametro)
         */
        options = $.extend(true, {}, settings, attrOptions, options);
        
        /*
         * Métodos públicos
         * São chamados de dentro da classe: this.metodoPublico()
         * São chamados externamente: umaInstancia.metodoPublico()
         
            this.metodoPublico = function (p1, p2) {

            };
        
        */

        /*
         * Métodos privados
         * São chamados apenas de dentro da classe: metodoPrivado()
         
            var metodoPrivado = function (p1, p2) {

            };
        
        */
        
        /*
         * Instanciação do plugin que está sendo estendido (se for o caso).
        */
         
        
        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         
            element.addClass('minhaClasse');
            element.click(function () {
                element.toggleClass('classeDinamica');
            });
        
        
        
        if (options.sourceTitle == "true") {
           alert ("Title");
        } else if (options.sourceHtml == "true") {
            alert ("Html");
        }
        
        */
        
        text = options.text;
        sourceId = options.sourceId;
        
        element.attr("role", "tooltip");
        element.attr("tabindex", "0");
        
        /*
         * Verifica qual o contexto (text simples ou HTML) utilizado pelo desenvolvedor
         */
        // Se foi informado um texto
        if (text) {
            element.popover({
                trigger:"hover focus",
                placement:"top",
                content: text
            });
        // Se foi informado o sourceId
        } else if (sourceId) {
            
            source = $('#' + sourceId);
            
            // Se o sourceId informado corresponde a um elemento na página
            if (source.length) {
            
                source.addClass("tooltip");
                source.attr("aria-hidden", "true");
                
                element.popover({
                    html : true,
                    trigger: "hover focus",
                    placement: "top",
                    content: source.html()
                });
                
                element.hover(function() {
                    source.attr("aria-hidden", "false");
                }, function() {
                    source.attr("aria-hidden", "true");
                });
                
                element.focusin(function() {
                    source.attr("aria-hidden", "false");
                });
                element.focusout(function() {
                    source.attr("aria-hidden", "true");
                });
                
            
            } else {                
                console.warn('Erro ao ativar o widget Tooltip para o elemento: ', element, '\n' +
                             'O parâmetro sourceId (' + sourceId + ') não corresponde a um elemento da página.');
            }
        // Não foi informado nem text nem sourceId
        } else {
            console.warn('Erro ao ativar o widget Tooltip para o elemento: ', element, '\n' +
                         'Informe um dos parâmetros necessários (text ou sourceId).');
        }
        
        // Fecha o Tooltip através da tecla Esc
        element.keydown(function(e){
            if (e.keyCode === key.esc) {
                element.popover('hide');
            }
        });
    };
        
    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Tooltip', Tooltip);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Zoomable */
/**
Este Widget adiciona a funcionalidade de zoom para as imagens.

Este widget possibilita duas marcações. Quando não é necessária uma descrição para a imagem (neste casa a propriedade alt do HTML necessária na tag img é suficiente) e quando é necessária uma descrição mais detalhada. As duas possibilidades possuem exemplos citados a seguir.

@module Zoomable
@attribute data-pic-zoomable
@param - Quando a imagem não exige descrição mais detalhada a marcação é a seguinte:
<img data-pic-zoomable src="images/imagemExemplo.png" alt="Breve descrição da iamgem">
@param {text} sourceId - Informar o id do elemento que será a descrição da imagem. Na passagem dos parâmetros "sourceId" é indispensável.
@example
<div data-pic-zoomable='{"sourceId" : "descricao"}'>
    <img src="images/imagemExemplo.png" alt="Breve descrição da imagem">

    <div id="descricao">
        Este é um exemplo de descrição detalhada.
        Esta imagem representa o diagrama de Gestão da OS onde do ponto inicial seguimos para "Cadastrar SOlicitação de Proposta Técnica". Logo após seguimos para o ponto de "OS em Análise pela Fábrica". Em seguida podemos "Reformular a Proposta Técnica" ou seguir para "Executar Serviço". Em Seguida podemos acusar "Recebimento Provisório"
    </div>
</div>
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     */
    var var1 = 1,
        var2;

    /*
     * Definição da classe
     */
    var Zoomable = function (element, name, jsOptions) {
        
        /*
         * Variáveis de instância
         *   Como boa prática, defina aqui todas as variáveis que você vai utilizar na implementação
         *   do plugin. Claro que, se você vai criar funções para organizar seu código, essas 
         *   funções podem ter suas próprias variáveis definidas. Siga sempre a boa prática,
         *   também nessas funções, de definir as variáveis antes de tudo.
         *   As variáveis defaults, domains e options tem relação com os parâmetros que o plugin
         *   que está sendo implementado pode receber. Se ele não recebe parâmetros, nenhuma
         *   dessas variáveis são necessárias.
         */
        var defaults, 
            domains,
            options,
            cabecalhoHeight, /* Calcula a altura do cabeçalho */
            descricaoId, /* Armazena o ID da descrição */
            imgAlt, /* Armazena o valor do alt definido na tag img */                           
            parentWidth, /* Armazena a largura do elemento pai */
            parentId, /* Armazena o id do elemento pai */
            viewportHeight, /* Calcula a altura do Viewport */
            rodapeHeight, /* Calcula a altura do rodapé */
            zoomableDescricao, /* Armazena a descrição para adicionar após o zoomer ser estanciado */
            zoomerHeight, /* Armazena o valor da altura após cálculo */
            zoomableParent; /* Armazena referência do elemento pai */
            
        /*
         * Valores default das opções do plugin
         *   Como boa prática, defina aqui um valor padrão para cada uma das opções que o plugin
         *   pode receber, ainda que seja 0 para valores numéricos, string vazio para textos,
         *   false para booleanos, etc.
         *   Ao fazer isso, você terá aqui uma lista de todas os parâmetros que seu plugin pode
         *   receber, e terá um código auto-documentado.
        */ 
        defaults = {
            sourceId: ''            
        };
        
        /*
         * Colecionando as opções do plugin
         *   Após essa chamada, você terá no objeto 'options' as opções prontas para utilizar
         *   na implementação do plugin.
         *   Como boa prática, você não deve passar esse 'options' para um plugin que estiver
         *   sendo extendido, visto que ele pode conter quaisquer parâmetros que o desenvolvedor
         *   informar. Controle os parâmetros que você vai passar para o plugin que está sendo
         *   extendido usando as chaves específicas correspondentes a cada parâmetro, como
         *   options.opcao1, options.opcao2.
         *   Note que 'defaults' e 'domains' são opcionais, mas para informar 'domains',
         *   é preciso informar também 'defaults'. Assim, são possíveis as chamadas:
         *   - PIC.collectOptions(element, name, jsOptions);
         *   - PIC.collectOptions(element, name, jsOptions, defaults);
         *   - PIC.collectOptions(element, name, jsOptions, defaults, domains);
         *   Essa chamada é necessária apenas se o plugin que está sendo implementado
         *   recebe parâmetros.
         */
        options = PIC.collectOptions(element, name, jsOptions, defaults, domains);
                     
        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
        */
        
        if (options.sourceId) {
            /* Armazena descrição através do ID informado */
            zoomableDescricao = element.find("#"+options.sourceId);
            
            /* Armazena o valor do alt */
            imgAlt = element.find("img").attr("alt");
            
            /* Armazena a referência ao elemento pai */
            var zoomableParent = element.parent();
            
            /* Armazena a altura da viewport, rodapé, cabeçalho e efetua o cálculo
             * para aplicar no zoomer
             */
            viewportHeight = $(window).height();            
            rodapeHeight = $(".rodape").actual("height");            
            cabecalhoHeight = $("#cabecalho").actual("height");            
            zoomerHeight = viewportHeight - rodapeHeight - cabecalhoHeight - 100;            
            parentWidth = zoomableParent.actual("width");
            zoomableParent
                .css("width", "100%")
                .css("height", zoomerHeight).css("max-height", zoomerHeight);

            /* Método do zoomer para recalcular o tamanho da imagem de acordo com  
             * o redimensionamento.
             */
            zoomableParent.on('resize', function () {
                zoomableParent.zoomer('resize');
            });
            
            /* Define, dinamicamente, um id para o elemento pai e armazena este id */
            element.parent().uniqueId();            
            parentId = element.parent().attr("id");
            
            /* Instancia o zoomer */
            zoomableParent.zoomer();
            
            /* Insere a descrição */
            $("div").find("#"+parentId).find("img").parent().append(zoomableDescricao);

            /* Armazena o id da descrição */
            descricaoId = options.sourceId;
            
            /* Reinsere o alt antes armazenado, insere tabindex e os elementos ARIA */
            $("div").find("#"+parentId).find("img").attr("alt", imgAlt);            
            $("div").find("#"+parentId).find("img").attr("tabindex", "0");            
            $("div").find("#"+parentId).find("img").attr("aria-describedby", descricaoId);
            $("div").find("#"+parentId).find("div#"+options.sourceId).css("display", "none");
            
            /* Para o funcionamento da acessibilidade o elemento precisa do click após o foco */            
            $("div").find("#"+parentId).find("img").focus(function(){
                $("div").find("#"+parentId).find("img").click();
            });
        } else {
            /* Armazena o alt */
            imgAlt = element.attr("alt");
            
            /* Cria um elemento container para aplicar o zoomer */
            element.wrap("<div></div>");            
            
            /* Armazena a referência ao elemento pai */
            zoomableParent = element.parent();
            
            /* Armazena a altura da viewport, rodapé, cabeçalho e efetua o cálculo
             * para aplicar no zoomer
             */
            viewportHeight = $(window).height();            
            rodapeHeight = $(".rodape").actual("height");            
            cabecalhoHeight = $("#cabecalho").actual("height");            
            zoomerHeight = viewportHeight - rodapeHeight - cabecalhoHeight - 100;            
            parentWidth = zoomableParent.actual("width");
            zoomableParent
                .css("width", "100%")
                .css("height", zoomerHeight).css("max-height", zoomerHeight);

            /* Método do zoomer para recalcular o tamanho da imagem de acordo com  
             * o redimensionamento.
             */
            zoomableParent.on('resize', function () {
                zoomableParent.zoomer('resize');
            });
            
            /* Instancia o zoomer */
            zoomableParent.zoomer();
            
            /* Cria elemento de descrição */
            zoomableParent.find("img").after("<div>"+ imgAlt +"</div>");
            zoomableParent.find("img").next().uniqueId();
            zoomableParent.find("img").next().css("display", "none");
            var descricaoId;
            descricaoId = zoomableParent.find("img").next().attr("id");
            
            /* Cria elemento ARIA e insere tabindex */
            zoomableParent.find("img").attr("aria-labelledby", descricaoId);
            zoomableParent.find("img").attr("alt", imgAlt);
            zoomableParent.find("img").attr("tabindex", "0");            
        }        
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Zoomable', Zoomable);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Tabs */
/**
Apresenta o conteúdo em abas.

O `li` correspodente à aba mostrada inicialmente deve ser marcado com `data-pic-state-current`.
Se não for informado, a primeira aba será mostrada.

@module Tabs
@attribute data-pic-tabs
@example
<div data-pic-tabs>
   <ul class="tab-list">
       <!-- href deve coincidir com o id do conteúdo -->
       <li><a href="#t1">Aba 1</a></li>
       <li><a href="#t2">Aba 2</a></li>
   </ul>
   <div class="tab-content">
       <div id="t1">conteúdo 1</div>
       <div id="t2">conteúdo 2</div>
   </div>
</div>
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Definição da classe
     */

    var Tabs = function (element, name, jsOptions) {

        /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var tabsArea = 0,
            increase = 0,
            tabsContainer,
            tabsContainerWidth = 0,
            scrolling,
            numBtns = 0,
            prevId,
            tabList,
            tabs,
            tabId;

        /*
         * Métodos públicos
         */

        /*
         * Métodos privados
         */

        var tabsControl = function () {

            //Determina a largura da nav-tabs(ul) de acordo com o número e largura de cada aba;
            var widthNavTabs = 0,
                numTabPanelDiv = 0,
                anchorArray = [],
                idAbaActive;

            numBtns = 0;
            element.find(".nav-tabs li").each(function(){
                var anchor = $(this).children().attr("href").replace("#","");
                anchorArray.push(anchor);

                //$(this).attr("role", "presentation");
                $(this).children().attr("role", "tab");
                $(this).children().attr("data-toggle", "tab");

                $(this).hasClass("active") ? $(this).children().attr("aria-expanded", "true") : $(this).children().attr("aria-expanded", "false");
                $(this).hasClass("active") ? $(this).children().attr("aria-selected", "true") : $(this).children().attr("aria-selected", "false");

                $(this).children().attr("id", anchor + "-tab");

                //$(this).index() == 0 ? $(this).children().attr("tabindex", "-1") : $(this).children().attr("tabindex", "-1");
                $(this).hasClass("active") ? $(this).children().attr("tabindex", "0") : $(this).children().attr("tabindex", "-1");

                $(this).children().attr("aria-controls", anchor);
                numBtns++;
                widthNavTabs = widthNavTabs + $(this).actual("width") + 1;

                if ($(this).hasClass("active")) {
                    idAbaActive = $(this).children().attr("href");
                    $(idAbaActive).addClass("tab-pane fade active in");
                }
            });

            element.find(".tab-content > div").each(function(){
                $(this).attr("role", "tabpanel");
                $(this).attr("aria-labelledby", anchorArray[numTabPanelDiv] + "-tab");
                //$(this).attr("id", anchorArray[numTabPanelDiv]);
                $(this).addClass("tab-pane fade");
                $(this).hasClass("active") ?
                    $(this).attr("aria-hidden", "false") :
                $(this).attr("aria-hidden", "true");
                numTabPanelDiv++;
            });

            //Determina um valor fixo para a largura dos botões de controle que deslizam as tabs para esquerda(<) e direita(>);
            var controlWidthBtns = element.find(".controlBtnLeft").actual("outerWidth")*2;

            if (widthNavTabs < tabsContainer.actual("width")) {
                tabs.css("margin-left", "0");
                element.find(".controlBtnLeft").css("display", "none");
                element.find(".controlBtnRight").css("display", "none");

                element.find(".nav-tabs").css("width", "auto");//Atribui largura a ul .nav-tabs;
                element.find(".nav-tabs").css("left", "0");//Atribui posicao left a ul .nav-tabs;

                //Determina largura da div container do widget;
                tabsContainerWidth = tabsContainer.actual("width");

                //Determina largura da div tabs;
                //$(".tabs").css("width", tabsContainerWidth);
                tabs.css("width", "100%");

            } else {
                tabs.css("margin-left", element.find(".controlBtnLeft").actual("outerWidth"));
                element.find(".controlBtnLeft, .controlBtnRight").css("display", "block");

                element.find(".nav-tabs").css("width", widthNavTabs);//Atribui largura a ul .nav-tabs;

                //Determina largura da div container do widget;
                tabsContainerWidth = (tabsContainer.actual("width") - 1) - controlWidthBtns;

                //Determina largura da div tabs;
                tabs.css("width", tabsContainerWidth);
            }

            //É largura da .tabs-container subtraindo a largura das tabs somadas;
            //tabsArea = -Math.abs(tabsContainerWidth - widthNavTabs);
            tabsArea = -Math.abs(tabsContainerWidth - widthNavTabs) * -1;
            //console.log(tabsArea)

            //Valor adicionado a margin para deslisar a tabs de maneira uniforme de acordo com a largura da tabs;
            increase = parseInt((tabsArea/numBtns).toFixed(1));
            //tabsArea = -Math.abs(numBtns * increase);

            var navTabsPosition = parseInt(element.find('.nav-tabs').parent().css("left").replace("px",""));
            if(navTabsPosition < tabsArea-increase){
                element.find('.nav-tabs').css("left", tabsArea);
            }

            //$( ".nav-tabs" ).offset({ left: -30 });
            //console.log("tamanho da lista:" + widthNavTabs + "/ tabsArea:" + tabsArea + "/ increase: " + increase);
        };

        var abaResponsiva = function () {
            element.find(".nav-tabs > li").each(function(){
                if($(this).attr("class") == "active"){
                    var position = $(this).position();
                    var abaPosition = parseInt(position.left.toFixed(1));
                    var abaWidth = parseInt($(this).actual("width").toFixed(1));
                    var abaNextWidth,
                        positionLeft;

                    if($(this).next().actual("width") != null){
                        abaNextWidth = parseInt($(this).next().actual("width").toFixed(1));
                    }

                    abaNextWidth = parseInt($(this).next().actual("width"));

                    if($(this).next().actual("width") != null){
                        positionLeft = parseInt((abaPosition - tabsContainerWidth) + abaWidth + abaNextWidth)/increase * increase;
                    }else{
                        positionLeft = parseInt((abaPosition - tabsContainerWidth) + abaWidth);
                    }

                    positionLeft = positionLeft.toFixed(0)
                    //console.log(positionLeft);
                    if(positionLeft > 0){
                        tabs.scrollLeft(positionLeft);
                    }
                }
            });
        };

        var tabindex = function (id) {

            element.find(".nav-tabs > li > a").each( function () {
                if ($(this).attr("id") == id) {
                    $(this).attr("tabindex", "0");
                } else {
                    $(this).attr("tabindex", "-1");
                }
            });
        };

        var prevNavTab = function () {
            var actualPosition = tabs.scrollLeft();

            if (actualPosition > 0 && actualPosition != increase) {
                tabs.scrollLeft(actualPosition - increase);
            } else {
                tabs.scrollLeft(0);
            }
            return false;
        };

        var nextNavTab = function () {
            var actualPosition = tabs.scrollLeft();

            if (actualPosition < tabsArea-increase) {
                tabs.scrollLeft(actualPosition + increase);
            } else {
                tabs.scrollLeft(tabsArea);
            }
            return false;
        };

        var enableTab = function (id) {

            element.find(".tab-pane").each(function () {
                if ($(this).attr("class") == "tab-pane fade active in") {
                    prevId = "#" + $(this).attr("id");
                }
            });

            $(prevId).removeClass("active in");
            $(id).addClass("active in");
            $(id).css("opacity", "0");

            $(id).animate({
                opacity: 100,
            }, 300, function(){
                $(this).css("opacity", "3");
            } );
        };

        // Controla o evento mouseup em window.
        var mouseupHandler = function () {
            $(window).on('mouseup.tabs', function () {
                // Interrompe a ação repetida (prev/next)
                clearInterval (scrolling);
                // Para de monitorar o mouseup
                $(this).off('mouseup.tabs');
                return false;
            });
        };

        // Configura funcionamento dos botões (left/prev e right/next)
        var setupButton = function (button, action) {
            // No click no button, executa action
            button.on('click', action);
            // No mousedown do button, executa action repetidamente,
            // até que o mouse seja liberado (mouseup).
            button.on('mousedown', function () {
                scrolling = setInterval(action, 200);
                // Passa a monitorar o mouseup (no window)
                mouseupHandler();
                return false;
            });
        };

        var setTabScroll = function () {
            //Posição da aba com relação ao plano x na ul nav-tabs;
            var position = $(this).parent().position();
            var abaPosition = parseInt(position.left.toFixed(1)) + parseInt($(this).parent().width());
            var $tabs = $(this).parent().parent().parent();
            var $li = $(this).parent();

            //Valor da posicao da ul nav-tabs em relação ao container tabs a partir da esquerda;
            var leftPosition = $tabs.scrollLeft();

            //Calcula intersecção dos pontos com relação a direita;
            if (abaPosition > Math.abs(leftPosition) + tabsContainerWidth) {

                if ($(this).parent().index() + 1 != numBtns){
                    $tabs.scrollLeft(leftPosition + ($li.width()/increase).toFixed(0) * increase);
                } else {
                    $tabs.scrollLeft(tabsArea);
                }
            } else {
                // console.log("else")
                if ($(this).attr("id") != tabId) {
                    $tabs.scrollLeft(leftPosition + ($li.width()/increase).toFixed(0) * increase);
                }
            }

            //Calcula intersecção dos pontos com relação a esquerda;
            if (abaPosition - parseInt($(this).parent().width()) <= Math.abs(parseInt($tabs.scrollLeft())) && abaPosition != increase) {
                if ($(this).parent().index() > 0) {
                    $tabs.scrollLeft(leftPosition - ($li.width()/increase).toFixed(0) * increase);
                } else {
                    $tabs.scrollLeft(0);
                }
            } else {
                //console.log("Está fora da intersecção a esquerda");
            }
            tabindex($(this).attr("id"));
            tabId = $(this).attr("id")
        };

        var fromPanelNavigation = function(e) {
            var keyCode = e.keyCode || e.which;
            var idTabPanel = "#" + $(this).attr("id");

            if (e.ctrlKey) {
                switch (keyCode) {
                    case key.left:
                    case key.up:
                        $(idTabPanel + "-tab").focus();
                        e.preventDefault();
                        break;
                    case key.pageup:
                        //@TODO: implementar alternar para a aba anterior (ou para a última se estiver na primeira).
                        break;
                    case key.pagedown:
                        //@TODO: implementar alternar para a próxima aba (ou para a primeira se estiver na última).
                        break;
                }
            }
        };

        var tabNavigation = function (e) {
            var tabId;
            var keyCode = e.keyCode || e.which;

            //up - right - tab
            if (keyCode == key.down || keyCode == key.right) {
                if($(this).parent().index() < $(this).parent().parent().children().last().index()){
                    $(this).parent().next().children().focus();

                    $(this).parent().next().children().attr("tabindex", "0");
                    $(this).parent().children().attr("tabindex", "-1");

                    $(this).parent().removeClass("active");
                    $(this).parent().next().addClass("active");
                    e.preventDefault();

                    tabId = $(this).parent().next().children().attr("href");
                    enableTab(tabId);
                }
                //down - left
            } else if (keyCode == key.up || keyCode == key.left) {
                if($(this).parent().index() > 0){
                    $(this).parent().prev().children().focus();
                    $(this).parent().prev().children().attr("tabindex", "0");
                    $(this).parent().children().attr("tabindex", "-1");

                    $(this).parent().removeClass("active");
                    $(this).parent().prev().addClass("active");
                    e.preventDefault();

                    tabId = $(this).parent().prev().children().attr("href");
                    enableTab(tabId);
                }
                //enter
            } else if (keyCode == key.enter) {
                tabId = $(this).attr("href");
                enableTab(tabId);
                //end
            } else if (keyCode == key.end) {
                $(this).parent().parent().children().last().children().focus();
                $(this).parent().removeClass("active");
                $(this).parent().parent().children().last().addClass("active");
                e.preventDefault();

                tabId = $(this).parent().parent().children().last().children().attr("href");
                enableTab(tabId);
                //home
            } else if (keyCode == key.home) {
                $(this).parent().parent().children().first().children().focus();
                $(this).parent().removeClass("active");
                $(this).parent().parent().children().first().addClass("active");
                e.preventDefault();

                tabId = $(this).parent().parent().children().first().children().attr("href");
                enableTab(tabId);
            }
        };

        var setActiveTab = function () {
            
            var current;
            
            // Espera que um  único 'li' seja marcado como current
            current = tabList.find("li[data-pic-state-current]").first();
            
            if (current.length) {
                // Insere a classe 'active' no item encontrado.
                current.addClass('active');
                
            // Se não encontrou, define a primeira delas como ativa por padrão.
            } else {
                tabList.find('li').first().addClass('active');
            }
        };
        
        /*
         * Implementação do plugin
         */

        tabList = element.find('.tab-list');
        tabs = tabList.wrap ('<div class="tabs"></div>').parent();

        setActiveTab();

        tabs.attr("role", "tabpanel");
        tabs.addClass("invisibar");
        tabList.attr("role", "tablist");
        tabList.addClass("nav nav-tabs breakscroll");

        tabsContainer = tabs.wrap('<div class="tabs-container"></div>').parent();
        tabsContainer.prepend('<div class="controlBtnRight"><a title="Direita" class="btn-right"><span class="glyphicon glyphicon-menu-right"></span></a></div>');
        tabsContainer.prepend('<div class="controlBtnLeft"><a title="Esquerda" class="btn-left disable"><span class="glyphicon glyphicon-menu-left"></span></a></div>');

        element.find(".tab-content").appendTo(tabsContainer);

        tabsControl();

        tabsContainer.resize(function () {
            tabsControl();
            abaResponsiva();
        });

        //Listener ----------------------------/
        // Monitora a posição da rolagem horizontal das abas,
        // para habilitar/desabilitar os botões que fazem essa rolagem
        // @TODO: controlar melhor a execução desse 'setInterval', disparando-o somente se os botões existirem
        setInterval(function () {
            if (tabs.scrollLeft() > 0) {
                element.find(".btn-left").removeClass("disable");
            } else {
                element.find(".btn-left").addClass("disable");
            }

            if (tabs.scrollLeft() == tabsArea) {
                element.find(".btn-right").addClass("disable");
            } else {
                element.find(".btn-right").removeClass("disable");
            }
        }, 200);

        //Events ------------------------//
        setupButton (element.find('.btn-left'), prevNavTab);
        setupButton (element.find('.btn-right'), nextNavTab);

        element.find("[data-toggle=tab]").click(setTabScroll);

        element.find(".tab-content").on('keydown', '[role=tabpanel]', fromPanelNavigation);

        tabs.on('keydown', '[data-toggle=tab]', tabNavigation);
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Tabs', Tabs);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Tree View */
/**
Transforma uma lista (em um ou dois níveis) em um menu local.

Use `data-pic-state-current` no item de menu (`li`) que representa a página atual, seja um item
de primeiro (que não seja um agrupador) ou segundo nível.

@module Treeview
@attribute data-pic-treeview
@example
<ul class="navbar-collapse" data-pic-treeview>
    <li><a href="#">Funcionalidade de Primeiro Nível</a></li>
    <li><a href="#">Outra Funcionalidade como a Anterior</a></li>
    <li>
        <a href="#">Categoria Hipotética</a>
        <ul>
            <li><a href="#">Um item</a></li>
            <li><a href="#">Outro</a></li>
            <li><a href="#">E mais um da mesma categoria</a></li>
        </ul>
    </li>
    <li>
        <a href="#">Outra Categoria</a>
        <ul>
            <li><a href="#">Seja consistente</a></li>
            <li><a href="#">Agrupe adequadamente</a></li>
        </ul>
    </li>
    <li>
        <a href="#">Formas de Levantar as Categorias</a>
        <ul>
            <li><a href="#">Card Sorting</a></li>
            <li><a href="#">Focus Groups</a></li>
            <li><a href="#">Estudo do Negócio</a></li>
        </ul>
    </li>
</ul>
*/

;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     */

    /*
     * Sobrescrevendo os valores default do plugin que está sendo estendido.
     * Esses valores que servem para todas as instâncias do plugin.
     */
    $.fn.navgoco.defaults.cookie.expires = 10;

    /*
     * Definição da classe
     */
    var Treeview = function (element, name, options) {

        /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var defaults,
            domains;

        /*
         * Valores default
         */
        defaults = {
			save: true,
			cookie: {
				name: "navgoco",
				expires: false,
				path: '/'
			}
        };
        /*
         * Domínios
         */
        domains = {
        };

        /*
         * Reúne todas as opções do plugin
         */
        options = PIC.collectOptions(element, name, options, defaults, domains);

        /*
         * Métodos públicos
         */

        /*
         * Métodos privados
         */

        /*
         * Instanciação do plugin que está sendo estendido.
         */
		element.uniqueId();
        element.navgoco(options);

        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         */

        element.addClass('pic-treeview');

    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Treeview', Treeview);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Alert */
/**
Cria gráficos tipo pizza e barra a partir de dados passado por uma tabela.


@module Alert
@attribute data-pic-alert
@param {string} [type=info] - Tipos de mensagens de alert. Valores possíveis: success|info|warning|error.
@example
<div data-pic-alert='{"type": "info"}'>
	Texto.
</div>
 */
 
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     */

    /*
     * Tudo o que for necessário executar apenas uma vez, na carga da página
     * deve estar escrito aqui.
     * Se, por exemplo, o plugin que está sendo extendido expõe seus valores default
     * e é necessário modificar algum desses valores de forma geral,
     * isso deve ser feito aqui.
     */
     // $.fn.pluginOriginal.defaults.opcao = 'novo-valor';

    /*
     * Definição da classe
     */
    var Alert = function (element, name, jsOptions) {

         /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var defaults,
            domains,
            options;
            
        /*
         * Valores default das opções do plugin
         */
        defaults = {
			type: "info"
		};
        
        /*
         * Domínios
         */
        domains = {
            type: ["success", "info", "warning", "error" ],
        };
        
        /*
         * Colecionando as opções do plugin
         */
        options = PIC.collectOptions(element, name, jsOptions, defaults, domains);
	
        /*
         * Métodos públicos 
         */

        /*
         * Métodos privados
         */
		 
		/*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         */
		/* 
		* Definição de variáveis
		*/		
		element
		.addClass("alert alert-dismissible")
		.attr("role","alert")
		.prepend("<span class=\"glyphicon\" aria-hidden=\"true\"></span>" +
				"<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Fechar\"><span aria-hidden=\"true\">&times;</span></button>")

		switch(options.type){
			case "success":
				element.addClass("alert-success")
				element.children().first().addClass("glyphicon-ok")
				break;
			case "info":
				element.addClass("alert-info")
				element.children().first().addClass("glyphicon-info-sign")
				break;
			case "warning":
				element.addClass("alert-warning")	
				element.children().first().addClass("glyphicon-warning-sign")				
				break;
			case "error":
				element.addClass("alert-danger")
				element.children().first().addClass("glyphicon-exclamation-sign")				
				break;
			case window.key.left:
		}		
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Alert', Alert);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Chart */
/**
Cria gráficos a partir de dados de uma tabela.

##### Configuração interna

- `data`:
  Determina que cabeçalho(s) (`th`) correponde(m) aos dados que devem ser apresentados no gráfico.

@module Chart
@attribute data-pic-chart
@param {string} type - Tipo de gráfico. Valores possíveis: bar|pie.
@param {string} [transfomBreakpoint=xs] - Determina a partir de qual largura de tela a tabela será 
        transformada em gráfico. Valores possíveis xs|sm|md|lg.
@example
<table data-pic-chart='{"type": "pie"}' class="table"> 
    <caption class="sr-only">Valores</caption>
    <thead>
        <tr>
            <th>Mês</th>
            <th data-pic-chart-config='data'>Valor</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th>Janeiro</th>
            <td>1000</td>
        </tr>
        <tr>
            <th>Fevereiro</th>
            <td>1500</td>
        </tr>
        <tr>
            <th>Março</th>
            <td>3000</td>
        </tr>
    </tbody>
</table>

<table data-pic-chart='{"type": "bar"}'>
    <thead>
        <tr>
            <th></th>
            <th></th>
            <th></th>
        </tr>
    </thead>
    <tbody>	
        <tr>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    </tbody>
</table>
 */
 
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     */

    /*
     * Tudo o que for necessário executar apenas uma vez, na carga da página
     * deve estar escrito aqui.
     * Se, por exemplo, o plugin que está sendo extendido expõe seus valores default
     * e é necessário modificar algum desses valores de forma geral,
     * isso deve ser feito aqui.
     */
     // $.fn.pluginOriginal.defaults.opcao = 'novo-valor';

    /*
     * Definição da classe
     */
    var Chart = function (element, name, jsOptions) {

         /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var defaults,
            domains,
            options;
            
        /*
         * Valores default das opções do plugin
         */
        defaults = {
			transformBreakpoint: "xs"
		};
        
        /*
         * Domínios
         */
        domains = {
            type: ["bar", "pie"],
			transformBreakpoint: ["xs", "sm", "md", "lg"]
        };
        
        /*
         * Colecionando as opções do plugin
         */
        options = PIC.collectOptions(element, name, jsOptions, defaults, domains);
	
        /*
         * Métodos públicos 
         */

        /*
         * Métodos privados
         */
		 
		 /*
		 * Função para manipulação de largura e altura do gráfico gerado
		 */
		 var chartResize = function(obj, chart){
			
            var width = element.actual('width');
            
            // Define a largura do gráfico como a largura total disponível
            // e a altura como 50% da largura total disponível.
            obj.width = width;
            obj.height = width / 2;
			obj.__rgraph_aa_translated__ = false;
			chart.draw();
		 };
		 
		 var createChartContainers = function () {
			var hiddenTable,
				showCanvas,
				chartContainerWidth,
				chartContainerHeight;
		 
			/* Define classes bootstrap a serem usadas de acordo com ponto de partida informado 
			* para apresentação do gráfico e inibição da apresentação da tabela
			*/
			switch(options.transformBreakpoint) {
				case "xs":
					hiddenTable = "hidden-xs hidden-sm hidden-md hidden-lg";
					showCanvas = "visible-xs visible-sm visible-md visible-lg";
					break;
				case "sm":
					hiddenTable = "visible-xs hidden-sm hidden-md hidden-lg";
					showCanvas = "hidden-xs visible-sm visible-md visible-lg";
					break;
				case "md":
					hiddenTable = "visible-xs visible-sm hidden-md hidden-lg";
					showCanvas = "hidden-xs hidden-sm visible-md visible-lg";
					break;
				case "lg":
					hiddenTable = "visible-xs visible-sm visible-md hidden-lg";
					showCanvas = "hidden-xs hidden-sm hidden-md visible-lg";
					break;
			}
			
			/*
			* Caso o browser utilizado pelo usuário seja IE8 retira o canvas
			* e apresenta a tabela a qual o gráfico é baseado.
			*/
			if($.browser.msie){
				if($.browser.versionNumber === 8){
					hiddenTable = "visible-xs visible-sm visible-md visible-lg";
					showCanvas = "hidden-xs hidden-sm hidden-md hidden-lg";
				}
			}

			/*
			* Crio container chart altero o elemento para que ele possa 
			* ser container da tabela e do canvas e atribuo id a tabela
			*/
			element
			.uniqueId()
			.wrap("<div class=\"chart\">");
			element = element.parent();

			/*
			* Capturo a largura e altura do container onde está o char 
			* para estabeler seu tamanho inicial
			*/
			chartContainerWidth = element.actual("width");
			chartContainerHeight = element.actual("width")/100*50;
			
			/*
			* Crio container para a tabela para inserir classe "no-more-tables" e classes do bootstrap para
			* exibir e esconder a tabela/gráfico de acordo com os parametros 
			* informados pelo usuário sm, dm ou lg
			*/	
			element
			.children().first()
			.wrap("<div class=\"no-more-tables " + hiddenTable + "\">")
			.parent()
			.after("<canvas class=\""+ showCanvas +"\" width="+ chartContainerWidth +" height="+ chartContainerHeight +">Este browser não possui suporte para a geração do gráfico.</canvas>")
			
			/* 
			* Crio id ao canvas e atribuo valor a variável para manipulação do canvas pelo RGraph 
			*/
			element.find("canvas").uniqueId();		
			canvasId = element.find("canvas").attr("id");
        };
		 
        /*
        * Cria e alimenta atributo data-title para cada td da tabela
        */
		var createDataTitle = function(element){
			element.find('th').each(function(i){
				var th = $(this).text();
				element.find('tr').each(function(n){
					var $row = $(this);
					$('td:eq("'+i+'")', $row).attr("data-title", th);
				}); 
			});		 
		};
		
		var getDataTable = function(){
			var	m = 0,
				rowTitle,
				columnTitle;
			/*
			* Alimenta array's de colunas, linhas e dados
			*/
			var chartData = element.find("th").filterByConfig(name, "data");
            
            if (chartData.length === 0) {
                console.warn ('Chart: indique ao menos um cabeçalho de sua tabela (th) como fonte de dados, usando a configuração "data".', element);
            }

			chartData.each(function(){	
				/*
				* De onde os dados para a criação do gráfico em pizza deve partir
				*/
				var fromName = $(this).text(),
					indexFrom = $(this).index()-1;

				columnTitle = $(this).text();
				/*
				* Se gráfico for alimentado a partir de dado contido na coluna da tabela
				*/
				if($(this).parent().parent().is("thead")){
					arrReferenceTitles.push(columnTitle);			
					element.find("tbody tr").each(function (i) {
						var columnData = parseInt($(this).find("td:eq("+indexFrom+")").text());
						rowTitle = $(this).find(":eq(0)").text();					

						/* Alimenta array com dados para o tooltip do gráfico quando tipo for pizza */
						if(options.type === "pie"){
							arrSubTooltipsTitles.push(rowTitle)
						};

						if(m === 0){		
							arrSubReferenceTitles.push(rowTitle);
							options.type === "bar" ? arrData.push([columnData]) : arrData.push(columnData);						
						}else{
							arrData[i].push(columnData)
						}

					});
					m++;
				/*
				* Se gráfico for alimentado a partir de dado contido em alguma linha da tabela
				*/				
				}else{
					$(this).parent().find("td").each(function (i) {
						var rowData = parseInt($(this).text());
						columnTitle = element.find("thead th:eq("+$(this).index()+")").text();
						rowTitle = $(this).parent().children("th").text();
							
						i === 0 ? arrReferenceTitles.push(rowTitle):"";						
					
						if(m === 0){
							arrSubReferenceTitles.push(columnTitle);
							options.type === "bar" ? arrData.push([rowData]): arrData.push(rowData);
						}else{
							arrData[i].push(rowData);
						}					

						/* Alimenta array com dados para o tooltip do gráfico quando tipo for pizza */
						if(options.type === "pie"){
							arrSubTooltipsTitles.push(columnTitle)
						}
					});
					m++;
				}
			});

			/* Alimenta array com dados para o tooltip do gráfico quando tipo for barras */		
			chartData.each(function(){
				if(options.type === "bar"){
					for ( i = 0; i < arrReferenceTitles.length; i++ ) {
						arrSubTooltipsTitles.push(arrReferenceTitles[i].toString());
					}
				}
			});
		};
        
		var createChart = function(type){
			switch(type) {
				case "pie":
					canvas = document.getElementById(canvasId);
					RGraph.Reset(canvas);

					/* Transforma dados inteiros em string para serem usados nas labels */
					var arrdDataText = [];
					for ( i = 0; i < arrData.length; i++ ) {
						arrdDataText.push(arrData[i].toString());
					}
					
					var pie = new RGraph.Pie(canvasId, arrData)
					.set('colors', arrColorPattern)
					.set('title', caption + " - " + arrReferenceTitles)
					.set('labels', arrdDataText)
					.set('gutter.top', 50)
					.set('key', arrSubTooltipsTitles)
					.set('key.position', 'gutter')	
					.set('key.position.y', 25)
					.set('key.interactive', true)
					.set('shadow', false)
					.set('labels.sticks', true)
					.set('labels.sticks.length', 5)
					.set('tooltips.event', 'onmousemove')
					.set('tooltips', arrSubTooltipsTitles)
					.draw();
					
					element.on('resize.' + name, function(){chartResize(canvas, pie);});
                    
					break;
				case "bar":
					canvas = document.getElementById(canvasId);
					RGraph.Reset(canvas);		
					
					var bar = new RGraph.Bar(canvasId, arrData)
					.set('colors', arrColorPattern)				
					.set('title', caption)
					.set('title.x', 70)
					.set('title.y', 20)
					.set('gutter.left', 35)
					.set('gutter.top', 60)
					.set('shadow', false)
					.set('background.grid', true)
					.set('labels', arrSubReferenceTitles)
					.set('tooltips', arrSubTooltipsTitles)
					.set('tooltips.event', 'onmousemove')
					.set('key', arrReferenceTitles)
					.set('key.interactive', true)
					.set('key.position', 'gutter')		
					.set('key.position.y', 25)
					.set('key.position.x', 0)
					.draw();

					element.on('resize.' + name, function(){chartResize(canvas, bar);});
					break;
			}
		}
		/*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         */
		/* 
		* Definição de variáveis
		*/
		var caption = element.find("caption").text(),
		canvas,
		canvasId,
		arrReferenceTitles = [],
		arrSubReferenceTitles = [],
		arrSubTooltipsTitles = [],
		arrData = [],
		arrTooltipColuns = [],
		arrColorPattern = [	'#0d3c55', '#c02e1d', '#f16c20', 
							'#ecaa38', '#a2b86c', '#ef8b2c', 
							'#ca793', '#0f5b78', '#117899', 
							'#1395ba', '#ebc844', '#f16c20'];

		/* Cria estrutura para a inserção do gráfico */
		createChartContainers();

		/* 
		* Cria atributo data-title nas tr's da tabela
		* para ser utilizado pela classe CSS no-mo-tables
		* que transforma cada linha da tabela em visualização de cartões
		*/
		createDataTitle(element);

		/* Busca os dados contidos na tabela para alimentar os gráficos */
		getDataTable();
		
		/* 
		* Instância Rgraph, seta parâmetros para o plguin 
		* e cria gráficos de acordo com o tipo
		*/
		if(options.type != undefined || options.type != ""){
			createChart(options.type);
		}
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Chart', Chart);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Carousel */
/**
Transforma lista, conjunto de div's/sections e articles em carousel.

@module Carousel
@attribute data-pic-carousel
@example
<div data-pic-carousel>
    <div>
        Conteúdo 1...
    </div>
    <div>
        Conteúdo 2...
    </div>
    <div>
        Conteúdo 3...
    </div>
</div>
 */
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     */

    /*
     * Sobrescrevendo os valores default do plugin que está sendo estendido.
     * Esses valores que servem para todas as instâncias do plugin.
     */
     

    /*
     * Definição da classe
     */
    var Carousel = function (element, name, jsOptions) {

        var numItens,
            defaults,
            domains,
            options;
            
        /*
         * Valores default das opções do plugin
         */
        defaults = {
            type: 'default'
        };

        /*
         * Domínios
         */
        domains = {
            type: ['default', 'form']
        };
        
        /*
         * Colecionando as opções do plugin
         */
        options = PIC.collectOptions(element, name, jsOptions, defaults, domains);

         /*
         * Métodos públicos 
         */

        /*
         * Métodos privados
         */
		 var pageExchange = function(){
            element.find(".pagination .page").each(function (){
                if($(this).hasClass("active")){
                    $(this).children().attr({
                        "tabindex": "0",
                        "aria-selected": "true"
                    }).focus();
                    $(this).closest("div").children().first().
                    text("Carousel página " + ($(this).index()) +" de " + numItens);
                }else{
                    $(this).children().attr({
                        "tabindex": "-1",
                        "aria-selected": "false"
                    });
                }
            });

            element.find(".owl-item").each(function (){
                if($(this).hasClass("active")){
                    $(this).attr({
                        "aria-hidden": "true"
                    });
                }else{
                    $(this).attr({
                        "aria-hidden": "false"
                    });
                }
            });             
        }
        
        /*
        * Ativa e desativa itens de paginação
        */
        var activatePagingItem = function(numItem){
            pager.children().removeClass("active");
            pager.children("li:eq("+numItem+")").addClass("active");
        }
		
		
		var nextPrevBtnControler = function(numItem, pageCount){
			if(numItem > 1){
				pager.children(".prev").removeClass("disabled");
			}else{
				pager.children(".prev").addClass("disabled");			
			}
			
			if(numItem === pageCount){
				pager.children(".next").addClass("disabled");
			}else{
				pager.children(".next").removeClass("disabled");			
			}			
		}
		
        /* 
        * Vai para próxima página
        */
        var next = function(e){
            element.trigger('next.owl.carousel');
            pageExchange(); 
            e.preventDefault();
        }

        /* 
        * Vai para página anterior
        */
        var prev = function(e){		
            element.trigger('prev.owl.carousel');
            pageExchange(); 
            e.preventDefault();
        }
		
		/*
		* Altera marcação do tabindex de acordo com item selecionado
		*/
		var changeTabindex = function(){
			element.find("a").attr("tabindex","0");		
			console.log("change!")
		}
		
		/*
		* Calcula qual é a altura máxima para cada item de acordo
		* com a altura máxima encontrada dentre os ítens
		*/
		var itemMaxHeight = function(obj){
			var itemHeightInit, 
				itemHeightEnd = 0,
				percentHeighIE8;
			element.find(".owl-item").each(function(i){
				itemHeightInit = $(this).actual("outerHeight")
				
				/* Se browser for IE 8 calcula 20% da alturado item atribui valor a
				* variável percentHeighIE8 que será somada a maior altura final encontrada
				* para sanar bug ao buscar a altura real do item encontrado no IE8
				*/
				$.browser.msie === true && $.browser.versionNumber === 8 ? percentHeighIE8 = itemHeightInit/100*20 : percentHeighIE8 = 0;	
				if(itemHeightInit > itemHeightEnd){
					itemHeightEnd = itemHeightInit;
				}
			})
			
			/* Se não for IE8 percentHeighIE8 será igual a zero */
			return itemHeightEnd + percentHeighIE8;
		};
		
		/*
        * Configurações feitas na inicialização do plugin
        */
		/* Evento Initialized */
        element.on('initialized.owl.carousel', function(event) {
            numItens = event.item.count/event.page.size;
        }).addClass("owl-carousel owl-theme");	
		
		/*
         * Instanciação do plugin que está sendo estendido.
         */
        element.owlCarousel({
            autoplay: false,
            autoplayTimeout: 10000,
            loop: false,
            items: 1,
            dots: true,
            nav: false
        });
	
        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         */
		 
		/*
		* Eventos
		*/
		/*
		* Faz o resize do carousel de acordo com a alteração do seu tamanho com relação ao documento
		*/
		$(".owl-item").find(':tabbable').attr("tabindex","0");
		
		element.resize(
			function(){
				element.data("owl.carousel")._invalidated.width = true;;
				element.trigger('refresh.owl.carousel');
			}
		);		
		
        /* Configurações feitas na mudança de páginas */
		/* Changed */
        element.on('changed.owl.carousel', function(event) {
            var incremento = 1,
				numItem = event.item.index + incremento;
            activatePagingItem(numItem);
			nextPrevBtnControler(numItem, event.page.count);
        });
		
		/* Drag */
		element.on('drag.owl.carousel', function(event) {
        });

		/* Dragged */
		element.on('dragged.owl.carousel', function(event) {
        });
		
		/* Translated */
		element.on('translated.owl.carousel', function(event) {
        });	

		/* Translate */		
		element.on('translate.owl.carousel', function(event) {
        });			
		
        //Remove itens desabilitados para o uso
        element.find(".disabled").remove();
        element.find(".owl-dots").remove();
     
        /* Atribui id aos itens de conteúdo do carousel */
        element.find(".owl-item").uniqueId();

        /* 
        * Cria paginação
        */
        /* Cria lista de itens paginados logo após os itens do carousel */
        element.prepend("<div class=\"paginationContainer\"><ul role=\"tablist\" class=\"pagination\"></ul></div>");
        var pager = element.find(".pagination");

        /*
        * Parágrafo escondido para inserção de dados 
        * dinâmicos a serem lidos pelo leitor de tela
        */
        element.find(".paginationContainer").prepend("<p class='sr-only' aria-live='polite'>Carousel página 1 de "+ numItens +"</p>");
        
        /*
        * Insere linhas relativas a cada item do carousel na lista de paginação
        * e marcações WAI-ARIA
        */
        element.find(".owl-item").each(function(i){
            pager.append("<li class=\"page\">" +
            "<a tabindex=\"-1\"" +
            "aria-selected=\"false\"" +
            "aria-controls="+ $(this).attr("id") + "\ " +
            "href=\"#\" class=\"carousel-num-page\">" + (i + 1) + "</a></li>");
        }).css("height", itemMaxHeight());
		
        pager.children().first().addClass("active").children().attr({
            "tabindex": "0",
            "aria-selected": "true",
            "aria-controls":  $(this).attr("id")
        });
        
        //Atribui id aos itens de paginação
        element.find(".carousel-num-page").uniqueId();
        
        /*
        * Logo depois de popular a lista insere linha para item anterior 
        * em primeiro lugar na lista e por último insere linha para próxima item
        */      
        if (options.type === 'default') {
            pager.prepend("<li class=\"prev disabled\"><a tabindex=\"-1\" href=\"#\"><span class=\"glyphicon glyphicon-menu-left\"></span><span class=\"posicao\">Anterior</span></a></li>");
            pager.append("<li class=\"next\"><a tabindex=\"-1\" href=\"#\"><span class=\"posicao\">Próxima</span><span class=\"glyphicon glyphicon-menu-right\"></span></a></li>");
        }
        
        //Insere marcações WAI-ARIA
        element.find(".owl-item").each(function(i){
            i++;
            if($(this).hasClass("active")){
                $(this).attr("aria-hidden", "false");
            }else{
                $(this).attr("aria-hidden", "true");
            }
            
            $(this).attr({
                "aria-labellby": pager.children("li:eq("+i+")").children().attr("id")
            });
        }); 

		
        /* 
        * Triggers 
        */
        //Cria trigger para passar para o próximo item, link Próxima
        element.find(".next").click(function(e) {
			!$(this).hasClass("disabled") ? next(e):"";
        });
        
        //Cria trigger para voltar para o item anterior, link Anterior  
        element.find(".prev").click(function(e) {
			!$(this).hasClass("disabled") ? prev(e):"";
        });
        
        /*
        * Rotina para mudança de itens no evento click nos números de paginação 
        * ou dots caso sejam criados
        */
        element.find(".carousel-num-page").each(function(i) {
            $(this).click(function(e){
                element.trigger('to.owl.carousel', [i]);
				pageExchange();
                e.preventDefault();
            });
        });
        /* * */
            
        /*
        * Configura navegação por teclado
        */
        element.on('keydown', '.pagination li', function(e){
            var keyCode = e.which;

            switch(keyCode){
                case window.key.right:
                case window.key.down:
                    $(this).trigger('next.owl.carousel');
                    pageExchange();
                    e.preventDefault();
                    break;
                case window.key.left:
                case window.key.up:
                    element.trigger('prev.owl.carousel');
                    pageExchange();
                    e.preventDefault();
                    break;
                case window.key.home:
                    element.trigger('to.owl.carousel', [0]);
                    pageExchange();
                    e.preventDefault();                     
                    break;
                case window.key.end:
                    element.trigger('to.owl.carousel', [numItens-1]);
                    pageExchange();
                    e.preventDefault();                     
                    break;   
            }
        });

        /*
        * Configura elementos tabbable em cada aba do carousel
		*/
		element.delegate( ".owl-item", "focus", function(e) {
			if($(this).hasClass("active")){
				$(this).find(':tabbable').removeClass("focusnext");
			}else{
				if(!$(this).find(':tabbable').hasClass("focusnext")){
					$.focusNext();
					$(this).find(':tabbable').addClass("focusnext");
				}else{			
					$.focusPrev();
					$(this).find(':tabbable').removeClass("focusnext");
				}
			};
		});
    };
	

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Carousel', Carousel);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Accordion */
/**
Transforma listas ou conjuntos de div's em accordion.

@module Accordion
@attribute data-pic-accordion]
@param {number} openItem - Indica qual item deve iniciar aberto.
@example 
<div data-pic-accordion>
    <div>
        <div class="accordionTitle"></div>
        <div class="accordionContent"></div>
    </div>
</div>

<ul data-pic-accordion>
    <li>
        <div class="accordionTitle"></div>
        <div class="accordionContent"></div>
    </li>
</ul>

<section data-pic-accordion>
    <article>
        <div class="accordionTitle"></div>
        <div class="accordionContent"></div>
    </article
</section>
 */
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Definição da classe
     */
    var Accordion = function (element, name, jsOptions) {
       /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var defaults,
            domains,
            options;
            
        /*
         * Valores default das opções do plugin
         */
        defaults = {
			openItem: "1"
		};
        
        /*
         * Domínios
         */
        domains = {
        };
        
        /*
         * Colecionando as opções do plugin
         */
        options = PIC.collectOptions(element, name, jsOptions, defaults, domains);
	
        /*
         * Métodos públicos
         * São chamados de dentro da classe: this.metodoPublico()
         * São chamados externamente: umaInstancia.metodoPublico()
         */

        /*
         * Métodos privados
         * São chamados apenas de dentro da classe: metodoPrivado()
         */

        /*
         * Instanciação do plugin que está sendo estendido (se for o caso).
         */
          //element.plugin(options);
 
        /*
         * Implementação do plugin
         */		 
	 
        //element.uniqueId();
        element.attr({
            "role": "tablist",
            "aria-multiselectable": "true"
        }).addClass("accordionContainer").children().addClass("accordionBlock");

        /*element.find(".accordionBlock").each(function(){
            $(this).children().first().children().attr({
                role: "button",
                "aria-controls": $(this).children().first().children().attr("href").replace("#","")
            }); 
        });*/

		/*
		* Remove inserções de class in diretamente no html
		*/
        element.find(".accordionContent").each(function(i){
            $(this).hasClass("in") ? $(this).removeClass("in"): "";
        });
		
		/*
		* Remove inserções de class in diretamente no html
		*/
		var numContainer= 0;
        element.find(".accordionContent").each(function(){
            numContainer++
        });
		
		if(options.openItem > numContainer || options.openItem <= 0 ){
			console.warn("Item Nº"+ options.openItem +" indicado inexistente.")
		}
		
		/*
		* Insere class in de acordo com o número do conainer indicado pelo usuário
		*/
        element.find(".accordionContent").each(function(i){
            $(this).addClass("collapse");
			if(options.openItem == i+1){
				$(this).addClass("in");
			}
        }).uniqueId();
        
        element.find(".accordionTitle").each(function(i){

            $(this).attr({
                "role": "tab",
                "aria-selected": "false",
                "aria-expanded": "false",
                "tabindex":  "-1",
                "aria-controls": $(this).next().attr("id")
            }).uniqueId();
            
            $(this).next().attr({
                role: "tabpanel",
                "aria-labelledby": $(this).attr("id"),
                "aria-hidden": "true"
            }).uniqueId();
            
            if($(this).next().hasClass("in")){
                $(this).attr({
                    "aria-expanded": "true",
                    "aria-selected": "true",
                    "tabindex": "0"
                }).closest(".accordionBlock").addClass("active");
                
                $(this).next().attr({
                    "aria-hidden": "false"
                });
            }
        });

        element.on('show.bs.collapse', function () {
            element.find('.in').collapse('hide');
        });     
        
        
        element.find('.collapse').on('hide.bs.collapse', function () {
            $(this).prev().attr({
                "aria-expanded": "false",
                "aria-selected": "false",
                "tabindex": "-1"
            });
            $(this).attr("aria-hidden", "true");
        });

        element.find('.accordionTitle').click(function (e) {
            $(this).next().collapse('show');
            $(this).attr({
                "aria-expanded":"true",
                "aria-selected": "true",
                "tabindex": "0"
            });
            
            $(this).next().attr({
                "aria-hidden": "false"
            });
            
            element.find(".accordionBlock").each(function(){
                $(this).removeClass("active");
            });
            $(this).closest(".accordionBlock").addClass("active");
            
            e.preventDefault();
        });

        /* Implementação de navegação por teclado */
        element.find(".accordionTitle").keydown(function(e) {
            var keyCode = e.keyCode || e.which;
            
            switch(keyCode){
                case key.right:
                case key.down:
                    $(this).attr({
                        tabindex: "-1",
                        "aria-selected": "false"
                    });
                    
                    if($(this).closest(".accordionBlock").next().length){
                        $(this).closest(".accordionBlock")
                        .next()
                        .children().first()
                        .focus().attr({
                                        "tabindex": "0",
                                        "aria-selected": "true"
                                    });
                    }else{
                        $(this).closest(".accordionContainer")
                        .children().first()
                        .children().first().focus()
                        .attr({
                                "tabindex": "0",
                                "aria-selected": "true"
                            });
                    }
                    e.preventDefault();
                    break;
                case key.left:
                case key.up:
                    $(this).attr({
                        tabindex: "-1",
                        "aria-selected": "false"
                    });
                    if($(this).closest(".accordionBlock").prev().length){
                        $(this).closest(".accordionBlock")
                        .prev()
                        .children().first()
                        .focus()
                        .attr({
                            "tabindex": "0", 
                            "aria-selected": "true"
                            });
                    }else{
                        $(this).closest(".accordionContainer")
                        .children().last()
                        .children().first()
                        .focus()
                        .attr({
                            "tabindex": "0", 
                            "aria-selected": "true"
                            });     
                    }
                    e.preventDefault();
                    break;
                case key.end:
                    $(this).attr({
                        tabindex: "-1",
                        "aria-selected": "false"
                    });
                    $(this).closest(".accordionContainer")
                    .children().last()
                    .children().first()
                    .focus()
                    .attr({
                        "tabindex": "0", 
                        "aria-selected": "true"
                        });     
                    e.preventDefault();
                    break;
                case key.home:
                    $(this).attr({
                        tabindex: "-1",
                        "aria-selected": "false"
                    });
                    $(this).closest(".accordionContainer")
                    .children().first()
                    .children().first()
                    .focus()
                    .attr({
                        "tabindex": "0", 
                        "aria-selected": "true"
                        });     
                    e.preventDefault();
                    break;          
                case key.space:
                case key.enter:
                    $(this).click();
                    e.preventDefault();
                    break;
				case key.tab:
					console.log("123")
                    break;				
            }
        });

        element.find(".accordionContent").keydown(function(e) {
            var keyCode = e.keyCode || e.which;
            
            if (e.ctrlKey) {
                switch(keyCode){
                    case key.left:
                    case key.up:
                        $(this).closest(".accordionBlock")
                        .children().first()
                        .focus()
                        .attr({
                            "tabindex": "0", 
                            "aria-expanded": "true"
                            });         
                        e.preventDefault();
                        break;
                }
            }
        });     

    };
    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Accordion', Accordion);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Fileinput */
/**
Cria calendário junto ao input.

@module Fileinput
@attribute data-pic-fileinput
@param {string} rangeLow - 	Para determinar um limite inferior para seleção de data, 
@example
<input data-pic-datepicker />
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     */

    /*
     * Tudo o que for necessário executar apenas uma vez, na carga da página
     * deve estar escrito aqui.
     * Se, por exemplo, o plugin que está sendo extendido expõe seus valores default
     * e é necessário modificar algum desses valores de forma geral,
     * isso deve ser feito aqui.
     */
    // $.fn.pluginOriginal.defaults.opcao = 'novo-valor';

    /*
     * Definição da classe
     */
    var Fileinput = function (element, name, options) {

        /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var settings,
            attrOptions;

        /*
         * Valores default, se houver
         */
        settings = {
        };

        /*
         * Opções obtidas por meio do valor associado ao atributo que identifica o plugin
         */
        attrOptions = PIC.getAttrOptions (element, name);

        /*
         * Extensão de options: passa a ser o 'merge' entre settings (fixo) e options (parametro)
         */
        options = $.extend(true, {}, settings, attrOptions, options);

        /*
         * Métodos públicos
         * São chamados de dentro da classe: this.metodoPublico()
         * São chamados externamente: umaInstancia.metodoPublico()
         */
        // this.metodoPublico = function (p1, p2) { };

        /*
         * Métodos privados
         * São chamados apenas de dentro da classe: metodoPrivado()
         */

        /*
         * Instanciação do plugin que está sendo estendido (se for o caso).
         */
		
		if(options.type === "widget"){
			element.fileinput({
					language: "pt-BR",
					uploadUrl: "data",
					allowedFileExtensions: ['jpg', 'gif', 'png', 'txt'],
					maxFileCount: 3
				}
			);
		}else{
			element.fileinput({
				showPreview: false,
				showUpload: false,
				showCancel: false,
				language: "pt-BR",
				removeClass: "btn btn-secondary",
				layoutTemplates: {
					caption:	'<div tabindex="0" class="form-control file-caption {class}">\n' +
								'   <div class="file-caption-name"></div>\n' +
								'</div>',
					btnDefault: '<button type="{type}" aria-label="Remover arquivo selecionado" tabindex="-1" title="{title}" class="{css}"{status}>{icon}</button>'
				}
			});
		}

        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         */
		 
		//*TODO - Comentar lógica usada: 
		element.parent().parent().prev()
		.before("<span aria-live=\"polite\" class=\"sr-only\"><span>")
		
		element.parent()
		.attr("tabindex","-1")
		.attr("aria-label","Procurar arquivo para upload")
		.attr("aria-role","button")
		.attr("aria-controls", element.attr("id"));

		element.parent().parent().prev()
		.attr("aria-label", "Procurar arquivo para upload")
		.attr("aria-role", "input");
		
		/*
		* DIV que simula a input type file para seleção e inserção do arquivo para upload
		*/
		element.parent().parent().prev().on("keydown", function(e){
			if(e.which === key.right || e.which === key.down){
				if(element.parent().parent().children(".fileinput-remove").is(":visible")){
					element.parent().parent().children(".fileinput-remove").focus();
				}else{
					element.parent().focus();
				}
			}else if(e.which === key.enter){
				element.click();
			}
			e.preventDefault();			
		})
		
		/* 
		* Botão para limpar/remover seleção feita
		*/
		element.parent().parent().children(".fileinput-remove").on("keydown", function(e){
			var keyCode = e.which;
		
			switch(keyCode){
				case key.right:
				case key.down:
					element.parent().focus();
				break;
				case key.left:
				case key.up:
					element.parent().parent().prev().focus();				
				break;
				case key.enter:
					element.parent().parent().children(".fileinput-remove").click();
			}
			e.preventDefault();
		})
		
		/*
		* WAI-ARIA
		*/
		element.change(function() {
			var arquivo = element.parent().parent().prev().text();
			element.parent().parent().prev().prev().text("Arquivo selecionado: "+arquivo)
		});

		/*
		* Botão para procurar o item a ser feito upload
		*/
		element.parent().on("keydown", function(e){
			if(e.which === key.enter){
				element.click();
			}else if(e.which === key.left || e.which === key.up){
				if(element.parent().parent().children(".fileinput-remove").is(":visible")){
					element.parent().parent().children(".fileinput-remove").focus();
				}else{
					element.parent().parent().prev().focus();
				}
			}
			e.preventDefault();			
		})
	
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Fileinput', Fileinput);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Datatable */
/**
Transforma tabela em uma datatable com sort, filtros e paginação.

##### Configuração interna

- `desc`: 
  Determina a coluna a qual se deseja que toda tabela seja ordenada de forma descendente a partir dela.
  A ordenação da tabela default é feita a partir da primeira coluna de forma ascendente.

- `nofilter`:
  Determina que a coluna marcada não será incluida no filtro.

- `nosort`: 
  Determina que a tabela não pode ser ordenada por meio dessa coluna.

@module Datatable
@attribute data-pic-datatable
@param {boolean} [filter=true] - Habilita ou desabilita campo para filtro. Valores possíveis: true|false.
@param {boolean} [sort=true] - Habilita ou desabilita sort para as colunas da tabela. Valores possíveis true|false
@param {mixed} [paginate=[10,20,50]] - Define a paginação para a tabela. Pode ser informado como:
- boolean: false, mostra todas as linhas (sem paginação); true, mantém o valor default.
- number: valor inteiro, positivo, que define quantas linhas serão mostradas por página (não dá escolha de modificação para o usuário).
- array contendo valores inteiros, positivos: cada posição do array é uma opção. O valor padrão, por exemplo, permite mostrar 10, 20 ou 50 linhas por página. A opção "Todos" é disponibilizada automaticamente.
@example
<table data-pic-datatable>
    <thead>
        <tr>
            <th data-pic-datatable-config='["desc", "nosort"]'>Coluna 1</th>
            <th data-pic-datatable-config='nofilter'>Coluna 2</th>
            <th data-pic-datatable-config='nosort'Coluna 3></th>
        </tr>
    </thead>
        <tr>
            <td></td>
        </tr>
    <tbody>
    </tbody>
</table>
 */
 
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     */

    /*
     * Tudo o que for necessário executar apenas uma vez, na carga da página
     * deve estar escrito aqui.
     * Se, por exemplo, o plugin que está sendo extendido expõe seus valores default
     * e é necessário modificar algum desses valores de forma geral,
     * isso deve ser feito aqui.
     */
     // $.fn.pluginOriginal.defaults.opcao = 'novo-valor';

    /*
     * Definição da classe
     */
    var Datatable = function (element, name, jsOptions) {

         /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var defaults,
            domains,
            options,
            paginateValues, 
            paginateLabels,
            lengthChange,
            pageLength,
            paging;
            
            
        /*
         * Valores default das opções do plugin
         */
        defaults = {
            filter: true,
            sort: true,
            paginate: [10, 20, 50]
        };
        
        /*
         * Domínios
         */
        domains = {
            filter: [true, false],
            sort: [true, false],
        };
        
        /*
         * Colecionando as opções do plugin
         */
        options = PIC.collectOptions(element, name, jsOptions, defaults, domains);

        /*
         * Métodos públicos 
         */

        /*
         * Métodos privados
         */
        var reconstruirListaBotoes = function() {
			//if(PIC.isXS($(window).width())){			
				element.find('[data-pic-actionsbar][data-pic-active]').each(function () {
					$(this).picActionsbar().destroy();
				});
				// @TODO verificar se não se deve trocar '[data-pic-tabela]' por element aqui
				PIC.activateWidget('Actionsbar', '[data-pic-datatable]');
			//}
        };
        
        /*$(document).ready(function($) {
            $(window).resize(function(){
                // @TODO Verificar o tamanho antigo e o tamanho novo, e reconstruir apenas se for necessário
                //       Será necessário se o tamanho antigo for XS e o novo não; e vice-versa.
				reconstruirListaBotoes();
            });
       });*/     
        
        
        // Analisa o parâmetro options.paginate e ajusta as variávies necessárias para fazer
        // com que a paginação funcione conforme o esperado.
        // Em outras palavras, traduz o valor de options.paginate para os valores esperados
        // pelo plugin original.
        var paginateSetup = function () {
            
            var validPaginate = true;
            
            lengthChange = false;
            pageLength = defaults.paginate[0];
            paging = true;

            switch ($.type(options.paginate)) {
                
                case 'array':
                    
                    if (options.paginate.length > 0) {
                        // @TODO testar se todos os valores são inteiros positivos?
                        // @TODO ordenar os valores informados de forma ascendente?
                        
                        // Cria cópias de options.paginate
                        paginateValues = options.paginate.slice();
                        paginateLabels = options.paginate.slice();
                        // Acrescenta valores correspondentes a "todos"
                        paginateValues.push(-1);
                        paginateLabels.push("Todos");
                        // Ativa a possibilidade de o usuário escolher o tamanho da página.
                        lengthChange = true;
                        // O tamanho inicial é a primeira das opções.
                        pageLength = options.paginate[0];
                        
                    // Se foi passado um array vazio
                    } else {
                        validPaginate = false;
                    }
                    break;
                    
                case 'number':
                    
                    // Um número positivo
                    if (options.paginate > 0) {
                        
                        pageLength = options.paginate;
                        
                    // Zero
                    } else if (options.paginate === 0){
                        // Desliga a paginação
                        paging = false;
                        
                    // Um número negativo
                    } else {
                        validPaginate = false;
                    }
                    break;
                    
                case 'boolean':
                    // Apenas 'liga' ou 'desliga' a paginação, mantendo tudo o mais como padrão
                    paging = options.paginate;
                    break;
                    
                default:
                    validPaginate = false;
                    break;
            }
            
            if (!validPaginate) {
                console.warn ('Datatable: O valor informado para o parâmetro "paginate" é inválido: "' + options.paginate + '"\n' +
                              'Informe um array com conteúdo, um número positivo ou um valor booleano.\n' +
                              'Utilizando o valor default para "paginate".', element);
            }
        }
        
        
        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         */
         
        /* 
        * Configurações da tabela        
        */
       //API datatables - para inserção da paginação do bootstrap no datatables
        $.fn.dataTableExt.oApi.fnPagingInfo = function ( oSettings ){
            return {
              "iStart":         oSettings._iDisplayStart,
              "iEnd":           oSettings.fnDisplayEnd(),
              "iLength":        oSettings._iDisplayLength,
              "iTotal":         oSettings.fnRecordsTotal(),
              "iFilteredTotal": oSettings.fnRecordsDisplay(),
              "iPage":          oSettings._iDisplayLength === -1 ?
                  0 : Math.ceil( oSettings._iDisplayStart / oSettings._iDisplayLength ),
              "iTotalPages":    oSettings._iDisplayLength === -1 ?
                  0 : Math.ceil( oSettings.fnRecordsDisplay() / oSettings._iDisplayLength )
            };
        };

        /* Bootstrap estilo paginação */
        $.extend( $.fn.dataTableExt.oPagination, {
          "bootstrap": {
              "fnInit": function( oSettings, nPaging, fnDraw ) {
                  var oLang = oSettings.oLanguage.oPaginate;
                  var fnClickHandler = function ( e ) {
                      e.preventDefault();
                      if ( oSettings.oApi._fnPageChange(oSettings, e.data.action) ) {
                          fnDraw( oSettings );
                      }
                  };

                  $(nPaging).append(
                    '<ul class="pagination">'+
                          '<li class="prev disabled"><a href="#" tabindex="-1" aria-label="Anterior"><span class="glyphicon glyphicon-menu-left"></span> <span class="posicao">'+oLang.sPrevious+'</span></a></li>'+
                          '<li class="next disabled"><a href="#" tabindex="-1" aria-label="Próxima"><span class="posicao">'+oLang.sNext+'</span> <span class="glyphicon glyphicon-menu-right"></span> </a></li>'+
                    '</ul>'
                  );
                  var els = $('a', nPaging);
                  $(els[0]).bind( 'click.DT', { action: "previous" }, fnClickHandler );
                  $(els[1]).bind( 'click.DT', { action: "next" }, fnClickHandler );           
              },

              "fnUpdate": function ( oSettings, fnDraw ) {
                  var iListLength = 5;
                  var oPaging = oSettings.oInstance.fnPagingInfo();
                  var an = oSettings.aanFeatures.p;
                  var i, j, sClass, sTabIndex, iStart, iEnd, iHalf=Math.floor(iListLength/2);

                  if ( oPaging.iTotalPages < iListLength) {
                      iStart = 1;
                      iEnd = oPaging.iTotalPages;
                  }
                  else if ( oPaging.iPage <= iHalf ) {
                      iStart = 1;
                      iEnd = iListLength;
                  } else if ( oPaging.iPage >= (oPaging.iTotalPages-iHalf) ) {
                      iStart = oPaging.iTotalPages - iListLength + 1;
                      iEnd = oPaging.iTotalPages;
                  } else {
                      iStart = oPaging.iPage - iHalf + 1;
                      iEnd = iStart + iListLength - 1;
                  }
                    var iLen;
                  for ( i=0, iLen=an.length ; i<iLen ; i++ ) {
                      // Remove the middle elements
                      $('li:gt(0)', an[i]).filter(':not(:last)').remove();

                      // Add the new list items and their event handlers
                      for ( j=iStart ; j<=iEnd ; j++ ) {
                          sTabIndex = (j==oPaging.iPage+1) ? 'tabindex="0"' : 'tabindex="-1"';
                          sClass = (j==oPaging.iPage+1) ? 'class="active"' : '';
                          $('<li '+sClass+'><a href="#"'+sTabIndex+'>'+j+'</a></li>')
                              .insertBefore( $('li:last', an[i])[0] )
                              .bind('click', function (e) {
                                    e.preventDefault();
                                    oSettings._iDisplayStart = (parseInt($('a', this).text(),10)-1) * oPaging.iLength;
                                    fnDraw( oSettings );
                                    
                                    $(".pagination").children().each(function(){
                                        if($(this).children().attr("tabindex") == "0"){
                                            $(this).children().focus();
                                        }
                                    });                             
                                    
                              } );
                      }

                      // Add / remove disabled classes from the static elements
                      if ( oPaging.iPage === 0 ) {
                          $('li:first', an[i]).addClass('disabled');
                          $('li:first', an[i]).children().attr('aria-disable', 'true');
                      } else {
                          $('li:first', an[i]).removeClass('disabled');
                          $('li:first', an[i]).children().attr('aria-disable', 'false');
                      }

                      if ( oPaging.iPage === oPaging.iTotalPages-1 || oPaging.iTotalPages === 0 ) {
                          $('li:last', an[i]).addClass('disabled');
                          $('li:last', an[i]).children().attr('aria-disable', 'true');
                      } else {
                          $('li:last', an[i]).removeClass('disabled');
                          $('li:last', an[i]).children().attr('aria-disable', 'false');
                      }
                  }
              }
          }
        });         
        
        /* Se o atributo data-pic-table fo encontrado atribui-se a tabela as classes 
        table-striped table-hover do bootstrap e uma div como conteiner com a classe no-more-tables
        para transformar a tabela em cards para telas pequenas */
        element.wrap("<div class=\"no-more-tables\"></div>");
        element.addClass("table-striped table-hover");
                    
        /*
        * Cria e alimenta atributo data-title para cada td da tabela
        */
        element.find('th').each(function(i){
            var th = $(this).text();
            element.find('tr').each(function(n){
                var $row = $(this);
                $('td:eq("'+i+'")', $row).attr("data-title", th);
            }); 
        });
        
        /*
        * Adiciona class noSortable para as colunas cujo o desenvolvedor não queria sort
        */ 
        element.find('th').filterByConfig(name, 'nosort').addClass('noSortable');

        //Cria array com os targets das colunas que não serão filtradas
        var targetsUnfiltered = [];
        
        element.find('th').filterByConfig(name, 'nofilter').each(function () {
            targetsUnfiltered.push($(this).index());
        });
        
        /* Determinar a posição da coluna que determina a ordem em que
        o conteúdo da tabela será apresentado, caso exista a configuração 'desc' 
        os dados serão dispostos a partir da coluna marcada
        descendentes, caso o atributo não seja encontrado a ordem será crescente(default) */
        var thPosition = [],
            thPositionOrder = [];
            
        element.find('th').filterByConfig(name, 'desc').each(function () {
            thPosition.push($(this).index());
            thPosition.push('desc');
            thPositionOrder.push(thPosition);
        });
        
        paginateSetup();
            
        
        /*
         * Instanciação do plugin que está sendo estendido
         */

        element.DataTable({
                            destroy: true,
                            //Determnina se a tabla é sorteble
                            "bSort": options.sort,
                            "order": thPositionOrder,
                            "bAutoWidth": true,
                            //Habilita/desabilita select para seleção de número de linha a serem exibidas
                            "lengthChange": lengthChange,
                            //Habilita/desabilita paginaçção
                            // "bPaginate": options.paginate,
                            "paging": paging,
                            //Habilita/desabilita filtro 'Pesquisa por:';
                            "bFilter": options.filter,
                            "aoColumnDefs": [{
                                                "bSortable": false, "aTargets": "noSortable"
											},
											{
                                                "searchable": false, "targets": targetsUnfiltered,
                                            }],
                            //Define valores para exibição de elementos por página
                            "lengthMenu": [paginateValues, paginateLabels],
                            //Determina a quantidade de elementos por página 
                            "pageLength": pageLength,
                            "sPaginationType": "bootstrap",
                            //"bStateSave": true,
                            //Tradução
                            "oLanguage": {
                                    "oAria": {
                                        "sSortAscending": "ordene de forma ascendente por ",
                                        "sSortDescending": "ordene de forma descendente por "
                                    },
                                    "sSearch": "Pesquisar por: ",
                                    "sEmptyTable": "Não foram encontrados dados para esta tabela.",
                                    "sLengthMenu": "Exibir _MENU_ por página",
                                    "sInfo": "De _START_ até _END_ de _TOTAL_ itens",
                                    "sZeroRecords": "Não foram encontrados resultados para esta pesquisa.",
                                    "sInfoEmpty": "Não foram encontrados itens correspondentes a sua pesquisa ",
                                    "sInfoFiltered": " - de um total de _MAX_ itens",
                                    "oPaginate": {
                                            "sFirst": "Primeira página",
                                            "sNext": "Próxima",
                                            "sPrevious": "Anterior"
                                    }
                            },
                            "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                            },
                            "fnDrawCallback": function( oSettings ) {
                            }
        });
        
        /*
        * Inseri interação com teclado na paginação do dataTables
        */
        element.next().on("keydown", ".pagination li", function(e) {
            var keyCode = e.which;
            
            if (keyCode == key.right || keyCode == key.down) {  
                e.preventDefault();
                if ($(this).next().index() === -1) {
                    $(this).parent().children().first().children().focus();
                } else {
                    $(this).next().children().focus();
                }
            } else if (keyCode == key.left || keyCode == key.up) {
                e.preventDefault();
                if ($(this).index() === 0) {
                    $(this).parent().children().last().children().focus();
                } else {
                    $(this).prev().children().focus();      
                }
            }
        });
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Datatable', Datatable);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Validation */
/**
Ativa a validação de campos de formulário.

Ao ativar a validação e definir as regras que os campos devem seguir, o Validation
cuida de verificar essas regras, permitindo a submissão do formulário apenas se todos os
campos válidos.

Há um conjunto de regras predefinidas, e outras regras podem ser criadas de acordo com
cada caso particular.

Para cada campo que se deseja validar, deve-se informar, no mínimo, um nome de regra de validação.
É possível informar mais de uma regra para um campo, e ele será considerado válido se atender
a *todas* as regras.

Além disso, é possível definir mensagens específicas para as regras em um campo. Quando há uma
mensagem associada a uma regra, caso essa regra não seja atendida, essa mensagem será mostrada,
em vez da mensagem padrão da regra.

##### Configuração interna

- `validate`:
  Nome da regra ou array com nomes das regras que devem ser validadas.

- `msg`:
  Mensagem de erro associada a uma regra, para um campo específico.

As regras e mensagens podem ser informadas para o campo de diferentes formas, de acordo com
a necessidade. São as seguintes possibilidades:

1. `data-pic-validation-config='{"validate" : "nomeRegra"}'`

   Essa é a forma mais simples, em que o campo deve a atender a uma única regra.

2. `data-pic-validation-config='{"validate" : ["nomeRegra1", "nomeRegra2"]}'`

   Se o campo precisar atender a mais de uma regra, o valor de `"validate"` deve ser um array contendo os nomes das regras.

3. `data-pic-validation-config='{"validate" : "nomeRegra", "msg" : "Minha mensagem para esse campo"}'`

   Se for necessário definir uma mensagem específica, acrescente a chave `"msg"` ao objeto, contendo a mensagem associada à regra.

4. `data-pic-validation-config='[{"validate" : "nomeRegra1", "msg" : "Mensagem 1"}, {"validate": "nomeRegra2", "msg" : "Mensagem 2"}, {"validate": "nomeRegra3"}]'`

   Se o campo precisar atender a mais de uma regra, e ao menos uma das regras precisar de uma
   mensagem específica, a configuração deve ser montada como um array em que cada posição é um
   objeto `{"validate", "msg"}`. A chave `"msg"` pode ser omitida quando não for necessária.

##### Regras disponíveis (lista não exaustiva)

- required
- CPF
- CNPJ
- CPFouCNPJ
- email
- ponto
- uRL
- checked:
  Para checkbox
- checkboxGroupRange
  Para definir o número mínimo e máximo de checkboxes marcados em um fieldset.
- checkboxGroupMinimum
  Para definir o número mínimo de checkboxes marcados em um fieldset.
- checkboxGroupMaximum
  Para definir o número máximo de checkboxes marcados em um fieldset.
- periodo:
  Data inicial deve ser menor que final (em um fieldset).


##### Definindo outras regras

É possível também definir regras novas, personalizadas, para um formulário específico.
Uma vez que uma regra personalizada tenha sido definida, pode ser usada exatamente da mesma forma
que as regras predefinidas. Veja um exemplo:

    // Crie uma função que implementa a regra; ela recebe o valor do campo como parâmetro e retorna:
    // - true se o valor estiver de acordo como o esperado
    // - false caso contrário
    var validaRegra = function (valor) {
        var result = (valor === 'valorEsperado');
        return result;
    };

    // Use o método 'setRule' do objeto 'picValidation' associado ao form.
    $('#meuForm').picValidation().setRule('minhaRegra', validaRegra, 'Mensagem em caso de valor inválido.');

@module Validation
@attribute data-pic-validation
@example
<form data-pic-validation>
    <div class="form-group">
        <label for="nome">Nome</label>
        <input data-pic-validation-config='{"validate": "required"}' id="nome" name="nome" type="text" class="form-control">
    </div>
    <div class="form-group">
        <label for="endereco">Email</label>
        <input data-pic-validation-config='{"validate": "email"}' id="endereco" name="endereco" type="email" class="form-control">
    </div>
    <input type="submit" value="Confirmar" />
</form>
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     */
    var rules = {},
        // O FormValidator trata de forma especial a regra 'notBlank', de modo que não é trivial
        // criar uma regra com outro nome que a substitua ou funcione como ela.
        // A solução foi criar um apelido (alias) para ela, de forma que o usuário do Validation
        // possa usar esse apelido, e o widget faça a tradução necessária.
        NOTBLANK_ALIAS = 'required';

    /*
     * Funções personalizadas de validação
     */
    // Indica erro se a data inicial for maior do que a final.
    // @TODO Tornar essa função mais robusta:
    //       Foi concebida para funcionar com navegadores que retornam a data dos input date
    //       no formato yyyy-mm-dd. Qualquer coisa diferente disso pode fazer com que ela
    //       funcione de forma inesperada.
    var validaPeriodo = function (value, fieldset) {
        console.debug (fieldset);

        var ini = {},
            fim = {},
            temIni,
            temFim;

        // Assume que, nesse fieldset, o primeiro input date é o início, e o segundo é o fim
        ini.input = fieldset.find('input[type=date]:eq(0)');
        fim.input = fieldset.find('input[type=date]:eq(1)');

        // console.debug ('Valores recebidos: ', ini.input.val(), fim.input.val());

        // Armazena data inicial e final de acordo com os valores dos inputs correspondentes.
        ini.date = new Date(ini.input.val());
        fim.date = new Date(fim.input.val());

        // Testa se os valores armazenados em .date são realmente datas.
        temIni = (ini.date instanceof Date && !isNaN(ini.date.valueOf()));
        temFim = (fim.date instanceof Date && !isNaN(fim.date.valueOf()));

        // Se são datas
        if (temIni && temFim) {

            // console.debug ('Tem inicio e fim: ', ini.date, fim.date);

            // Se a data inicial é maior do que a final
            if (ini.date.valueOf() > fim.date.valueOf()) {

                // Obtém do fieldset o texto dos labels associados aos inputs início e fim
                // por meio da relação id/for
                ini.label = fieldset.find('label[for="' + ini.input.attr('id') + '"]').text();
                fim.label = fieldset.find('label[for="' + fim.input.attr('id') + '"]').text();

                // Retorna indicando o erro e os nomes dos campos (labels) que irão compor a
                // mensagem de erro.
                return {
                    result: false,
                    params: [ini.label, fim.label]
                };
            }
        }
        // Assume que não há erro se as datas não foram informadas, ou
        // se data inicial não for maior do que a final.
        return true;
    };

    // Indica erro se nenhum campo estiver preenchido.
    // Considera-se "campo": input, select, textarea, desde que não seja type=checkbox ou type=radio.
    // Essa função está associada à regra 'required', que é aplicada (por nossa própria definição)
    // somente a fieldsets. Ver a implementação da função attributeTransform para entender maiores
    // detalhes de como isso é feito.
    var groupRequired = function (value, fieldset) {
        
        var anyFilled = false,
            fields = fieldset.find('input, select, textarea');
        
        fields.each(function (index) {
            
            var field = $(this);
            
            // Considera que há algum campo preenchido se:
            // - há algum valor informado, E
            // - o campo NÃO É nem checkbox nem radio
            if (field.val() && !(field.is(':checkbox') || field.is(':radio')))  {
                anyFilled = true;
                return false; // interrompe o each, não precisa procurar mais.
            }
        });
        // Retorna true se houver algum campo preenchido.
        return anyFilled;
    };
    
    /*
     * Ajustes globais do formValidator (que não dependem das instâncias criadas)
     *
     * Para seguir o padrão do PIC, optamos por não fazer alterações no arquivo de configuração
     * do formValidator. O que poderia ser feito lá está sendo feito aqui.
     * Assim, temos maior clareza sobre o que efetivamente foi personalizado, e o código
     * de terceiros permanece intacto.
     */

    // Estendendo e configurando a linguagem
    FFM.validatorLocalizedStrings.pt_br = {
        summaryHeadingSingle : "Seu formulário contém 1 erro",
        summaryHeadingPlural : "Seu formulário contém %s erros",
        errorPrefix : "<span style='font-family: FontAwesome; font-size: 16px;' class='FontAwesome' aria-hidden='true'>&#xf06a;</span> <em class='sr-only'>Atenção: </em>",
        errorSeparator : ": ",
        successPrefix : "Sucesso: ",
        waitingForValidation : "Validando..."
    };

    FFM.FormValidator.currentLocale = "pt_br";

    // Customização da lógica de onde a mensagem de erro deve ser "encaixada"
    // na estrutura html do campo que está sendo validado.
    // Se a função retornar null, a mensagem é colocada na posição padrão do formValidator.
    FFM.customLogicForElementToFollow = function (field) {
        // Se o input estiver dentro de um .input-group (classe do Bootstrap)...
        if (field.parent().is('.input-group')) {
            // ... a mensagem deve ser mostrada após o .input-group.
            return field.parent();
        // Se o input estiver dentro de um label (caso de checkbox ou radiobutton)...
        } else if (field.parent().is('label')) {
            // ... a mensagem deve ser mostrada após o label.
            return field.parent();
        // Se for um fieldset
        } else if (field.is('fieldset')) {
            return field.find("legend:eq(0)");
        }
        // Retornar null indica que o local da mensagem será definido pelas regras padrão
        // do FormValidator.
        return null;
    }

    // Novas regras de validação
    rules = {
        CPF:        [ /^[0-9]{3}[\.]?[0-9]{3}[\.]?[0-9]{3}[-]?[0-9]{2}$/, 'Não é um número de CPF válido'],
        CNPJ:       [ /^[0-9]{2}[\.]?[0-9]{3}[\.]?[0-9]{3}[\/]?[0-9]{4}[-]?[0-9]{2}$/, 'Não é um número de CNPJ válido'],
        CPFouCNPJ:  [ /^[0-9]{2}[\.]?[0-9]{3}[\.]?[0-9]{3}[\/]?[0-9]{4}[-]?[0-9]{2}$|^[0-9]{3}[\.]?[0-9]{3}[\.]?[0-9]{3}[-]?[0-9]{2}$/, 'Não é um número de CPF ou CNPJ válido'],
        // ponto: P_1234, P_123456, D_12345. "P_" e "D_" são opcionais, e podem ser maiúsculas ou minúsculas.
        ponto:      [ /^(P_)*([0-9]{4}|[0-9]{6})$|^(D_)*[0-9]{5}$/i , 'Não é um número de ponto válido'],
        periodo:    [ validaPeriodo , '"%s" deve ser menor que "%s"'],
        // Aqui, required corresponde também à string definida em NOTBLANK_ALIAS
        required:   [ groupRequired, "Preencha ao menos um dos campos."]
    };
    // Adiciona as novas regras às já existentes.
    $.extend(true, FFM.defaultValidatorRules, rules);

    // Para regras já existentes, fazer apenas a tradução necessária
    FFM.defaultValidatorRules.notBlank[1] = 'Campo obrigatório';
    FFM.defaultValidatorRules.email[1] = 'Não é um endereço de e-mail válido';
    FFM.defaultValidatorRules.checked[1] = 'Marque essa opção antes de continuar';
    FFM.defaultValidatorRules.checkboxGroupMinimum[1] = 'Marque ao menos %s dessas opções"';

    /*
     * Definição da classe
     */
    var Validation = function (element, name, jsOptions) {

        /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var options,
            formValidator;
        
        /*
         * Colecionando as opções do plugin
         */
        options = PIC.collectOptions(element, name, jsOptions);

        /*
         * Métodos públicos
         */

        /**
         * Define uma regra personalizada para o validador.
         *
         * @method setRule
         * @param ruleId {string} - Identificador (único) da regra, que será usado depois como valor de `validate`. Se o identificador já existir, sobrescreverá o existente.
         * @param callback {function} - Função que implementa a regra, e será chamada para validar o valor. Ela recebe como parâmetro o valor do campo a validar. Deve retornar false para indicar que há erro.
         * @param msg {string} - Mensagem que deve ser mostrada para o usuário se o valor do campo validado estiver errado.
         * @instance
         */
        this.setRule = function (ruleId, callback, msg) {

            var ruleData = [];

            // @TODO Testar se callback está definido e é uma função. Caso contrário, abortar.
            // @TODO Testar se msg está definido. Caso contrário, abortar.
            ruleData[0] = callback;
            ruleData[1] = msg;

            formValidator.setRule (ruleId, ruleData);
        };

        /*
         * Métodos privados
         * São chamados apenas de dentro da classe: metodoPrivado()
         */

        // Tudo o que deve ser executado se a validação estiver ok entra nessa função
        var validationCompletedHandler = function () {

            doSubmit();
        };

        // Tudo o que deve ser executado se a validação falhar entra nessa função
        var validationFailedHandler = function () {

            // Corrige mensagens de erro dos checkboxes
            formValidator.getInvalids().each(fixCheckboxErrorMsg);
        };

        // Submete o form
        var doSubmit = function ()  {
            /*
            Toda essa função foi necessária simplesmente porque o formValidator (original)
            faz um preventDefault da submissão do form (ou do clique do botão),
            resultando, estranhamente, em que o formulário não é submetido quando está
            tudo certo (sem erros) com ele.
            Isso acontece na function _onFormSubmit(e) { ... }
            */

            var trigger;

            /*
             * Faz a submissão do form
             */
            trigger = formValidator.getTrigger();

            if (trigger.is('form')) {
                // No 'submit' do formulário, o formValidator dispara essa função (doSubmit).
                // Por isso o handler do submit é desativado antes de fazer a submissão,
                // evitando que haja um 'loop infinito' aqui.
                trigger.off('submit').submit();
            } else {
                // Mesmo motivo do off('submit') acima.
                trigger.off('click').click();
            }
        };

        // Verifique se o campo é checkbox e faz os ajustes necessários nas mensagens de erro.
        var fixCheckboxErrorMsg = function () {

            var summaryItem,
                msg,
                label;

            if ($(this).is('[type=checkbox]')) {

                /*
                 * Correção da mensagem mostrada no sumário
                 */
                summaryItem = element.find('a[href="#' + $(this).attr('id') + '"]');

                // A mensagem que estava 'solta' no summaryItem é colocada no devido span
                msg = summaryItem.text();
                msg = '<span class="errorSummaryValue">' + msg + '</span>';

                // O label (texto que dá nome ao campo) é o texto do último nó dentro da tag 'label'.
                // Ele é obtido e colocado no devido span
                label = $(this).parent('label').contents().last().text().trim();
                label = '<span class="errorSummaryLabel">' + label + '</span> ';

                // O summaryItem é refeito: esvaziado; preenchido com label e msg
                summaryItem
                    .empty()
                    .append(label)
                    .append(msg);

            }
        };

        // Para todos os elementos validáveis, ativa/desativa a validação 'onblur'
        var setBlurValidation = function (validateOnBlur) {

            // Se é para validar, remove o atributo que impediria a validação.
            if (validateOnBlur) {
                element.find('input, fieldset').filterByConfig(name, 'validate').removeAttr('data-no_inline_on_blur');
            // Se não é para validar, coloca o atributo que impede a validação.
            } else {
                element.find('input, fieldset').filterByConfig(name, 'validate').attr('data-no_inline_on_blur', '');
            }
        };

        // Transforma os parâmetros vindos de 'data-pic-validation-config'
        // nos atributos data-* necessários para o formValidator
        var attributeTransform = function () {

            // Para cada elemento que tenha a configuração 'validate'
            element.find('input, select, textarea, fieldset').filterByConfig(name, 'validate').each(function () {

                var input,
                    config,
                    required = false,
                    requiredRule,
                    validate = '',
                    messages = {};

                input = $(this);

                // O formValidator exige que um fieldset com regra associada possua o atributo id.
                input.filter('fieldset').uniqueId();
                
                // Prepara um valor para a eventual necessidade de validação da regra NOTBLANK_ALIAS
                // Se for um fieldset, será mantido NOTBLANK_ALIAS (é uma regra nossa);
                // Se não for, será 'notBlank' (regra embutida do formValidation)
                requiredRule = input.is('fieldset') ? NOTBLANK_ALIAS : 'notBlank';

                config = input.config(name);

                // Se config for um array de objetos {validate, msg}
                if ($.type(config) === 'array') {

                    // Para cada posição, ou seja, cada regra
                    $.each(config, function (index, rule) {

                        // Tradução de NOTBLANK_ALIAS
                        if (rule.validate === NOTBLANK_ALIAS) {
                            rule.validate = requiredRule;
                            required = true;
                        }

                        // Armazena cada regra separada por espaços em um string
                        validate += rule.validate + ' ';
                        // Armazena a mensagem associada à regra no objeto messages
                        // Se rule.msg não estiver definido, não há problema; a mensagem
                        // padrão da regra não será sobrescrita.
                        messages['data-errormsg-' + rule.validate.toLowerCase()] = rule.msg;
                    });

                } else {

                    // Se validate for um array de regras
                    // (Nesse caso, não é possível fornecer mensagens padronizadas)
                    if ($.type(config.validate) === 'array') {

                        // Tradução de NOTBLANK_ALIAS
                        $.each(config.validate, function (index, rule) {
                            if (rule === NOTBLANK_ALIAS) {
                                config.validate[index] = requiredRule;
                                required = true;
                            }
                        });

                        // Armazena cada regra separada por espaços em um string
                        validate = config.validate.join(' ');

                    // Se validate for uma única regra
                    } else {

                        // Tradução de NOTBLANK_ALIAS
                        if (config.validate === NOTBLANK_ALIAS) {
                            config.validate = requiredRule;
                            required = true;
                        }

                        // Armazena a regra em um string
                        validate = config.validate;
                        // Armazena a mensagem associada à regra no objeto messages
                        // Se rule.msg não estiver definido, não há problema; a mensagem
                        // padrão da regra não será sobrescrita.
                        messages['data-errormsg-' + config.validate.toLowerCase()] = config.msg;
                    }
                }

                // Nesse ponto, validate vai conter o(s) nome(s) da(s) regra(s) (separados por espaço)
                // e messagens será um objeto em que cada chave será nomeada como 'data-errormsg-<nomedaregra>',
                // e estará associada à mensagem de erro definida para a regra.
                input.attr('data-validate', validate);
                input.attr(messages);

                
                // Se o campo for requerido (marcado com a regra NOTBLANK_ALIAS)
                if (required) {
                    
                    // Se o campo for um fieldset
                    if (input.is('fieldset')) {
                        input.addClass('required');
                    }
                    // se for algum dos outros controles listados.
                    else {
                        // Insere o atributo required do HTML5.
                        input.attr('required', '');
                        // Insere classe 'required' para permitir indicação visual do campo obrigatório.
                        input.closest('.form-group').addClass('required');
                    }
                }
            });
        };
        
        /*
         * Implementação do plugin
         */

        
        setBlurValidation(true);

        attributeTransform();

        formValidator = new FFM.FormValidator(element);

        // Indica a função a ser executada se a validação estiver ok.
        formValidator.setValidationCompletedHandler(validationCompletedHandler);
        // Indica a função a ser executada se a validação falhar.
        formValidator.setValidationFailedHandler(validationFailedHandler);
    };
    
    /*
     * Métodos estáticos (métodos de classe)
     */

    /**
     * Marca manualmente um erro em um campo específico.
     * Para remover o erro adicionado assim, use {@link clearError}
     * 
     * @method markError
     * @param field {mixed} - Campo de entrada ou fieldset que será marcado como contendo erro. Pode ser informado como um seletor, um elemento ou um objeto jQuery.
     * @param msg {string} - Mensagem de erro que deve ser associada ao campo.
     * @returns {boolean} Indica se marcou (true) ou não (false) o campo com erro.
     * @static
     */
    Validation.markError = function (field, msg) {
        var id,
            msgConteiner,
            elementToFollow;
        
        field = $(field);
        
        if (field.is('fieldset')) {
            // Se for um fieldset, garante que ele tenha um id.
            field.uniqueId();
        }
        
        id = field.attr('id');
        
        if (id && msg) {
            
            Validation.clearError(field);
            
            field.addClass("errorField");
            field.attr({
                "aria-invalid": "true",
                "aria-describedby": id + "-feedbackMsg",
                "data-customerror": "true"
            });
            
            msgConteiner = $('#' + id + '-feedbackMsg');
            
            if (!msgConteiner.length) {
                
                elementToFollow = FFM.customLogicForElementToFollow(field);
                
                if (!elementToFollow) {
                    
                    elementToFollow = field;
                }
                
                elementToFollow.after('<span id="' + id + '-feedbackMsg" class="feedbackMsg" tabindex="-1">');
                msgConteiner = $('#' + id + '-feedbackMsg');
            }
            
            msgConteiner
                .empty()
                .html(FFM.validatorLocalizedStrings.pt_br.errorPrefix + msg)
                .addClass('error')
                .attr('aria-hidden', false);
                
            return true;
        }
        return false;
    };

    /**
     * Remove um erro marcado manualmente um erro em um campo específico.
     * 
     * @method clearError
     * @param field {mixed} - Campo de entrada ou fieldset do qual o erro será removido. Pode ser informado como um seletor, um elemento ou um objeto jQuery.
     * @returns {boolean} Indica se desmarcou (true) ou não (false) o campo com erro.
     * @static
     */
    Validation.clearError = function (field) {
        var id;
        
        field = $(field);
        id = field.attr('id');
        
        // Não limpa o erro se não tiver sido inserido manualmente
        if (id && field.attr('data-customerror')) {
            
            field
                .removeClass("errorField")
                .removeAttr('data-customerror')
                .attr("aria-invalid", "false");
                
            $('#' + id + '-feedbackMsg')
                .empty()
                .removeClass('error')
                .attr('aria-hidden', true);
            
            return true;
        }
        return false;
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Validation', Validation);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Datepicker */
/**
Cria calendário junto ao input.

Todos os strings de data que são passados por parâmetro devem estar no formado `"DD/MM/YYYY"`

@module Datepicker
@attribute data-pic-datepicker
@param {string} [rangeLow] - Quando informado, datas anteriores a essa não poderão ser selecionadas.
@param {string} [rangeHigh] - Quando informado, datas posteriores a essa não poderão ser selecionadas.
@param {array} [disableDays] - Define quais dias da semana estarão desabilitados para seleção.
                                Cada posição do array representa um dia da semana, começando por domingo.
                                Para desabilitar sábados e domingos, por exemplo, use: `[1,0,0,0,0,0,1]`.
                                Por padrão, todos os dias estão habilitados.
@param {array} [disableDates] - Define datas específicas que estarão desabilitadas.
                                 Cada posição do array deve conter:
                                 um string representando uma data a ser desabilitada (nesse caso, pode-se usar `*` para generalizar, como "01/01/****" para representar esse dia e mês em qualquer ano)
                                 ou um array com duas posições, representando o início e o final de um período a ser desabilitado.
@param {string} [type=default] - Define a forma de exibição do calendário: default|inline. Use `inline` para ter o calendário sempre aberto, junto ao input.
@example
<input data-pic-datepicker type="text" id="dataExemplo">
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     */

    /*
     * Executa apenas uma vez, na carga da página
     */
    // Opções globais do datepicker (valem para todas as instâncias)
    datePickerController.setGlobalOptions({
        titleformat: "%j de %F de %Y",
        statusFormat: '%l, %d/%m/%Y'
    });

    /*
     * Definição da classe
     */
    var Datepicker = function (element, name, jsOptions) {

        /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var defaults,
            domains,
            options,
            elementId,
            opts;

        /*
         * Valores default das opções do plugin
         */
        defaults = {
            rangeLow: '',
            rangeHigh: '',
            type: 'default',
            disableDays: '',
            disableDates: ''
        };

        /*
         * Domínios
         */
        domains = {
            type: ['default', 'inline']
        };

        /*
         * Colecionando as opções do plugin
         */
        options = PIC.collectOptions(element, name, jsOptions, defaults, domains);

        /*
         * Métodos públicos
         * São chamados de dentro da classe: this.metodoPublico()
         * São chamados externamente: umaInstancia.metodoPublico()
         */
        // this.metodoPublico = function (p1, p2) { };

        /*
         * Métodos privados
         * São chamados apenas de dentro da classe: metodoPrivado()
         */

        // Recebe uma data no formato DD/MM/YYYY e retorna no formato YYYYMMDD.
        var invertDate = function(date){
            var jsonString = JSON.stringify(date);
                jsonString = jsonString.replace(/[{}"]/g, '');

            var pieces = jsonString.split('/');
            pieces.reverse();
            var reversed = pieces.join('');

            return reversed;
        };

        // Transforma o parâmetro disableDays para o formato esperado pelo datepicker original.
        var fixdisableDays = function () {

            var domingo;

            // Se disableDays for um array (o que é esperado),
            // Tira o primeiro elemento (domingo) e coloca no final.
            // Porque o datepicker original espera que domingo seja o último, e não o primeiro.
            if ($.isArray(options.disableDays) && (options.disableDays.length)) {
                domingo = options.disableDays.shift();
                options.disableDays.push(domingo);
            }
        };

        // Transforma o parâmetro disableDates para o formato esperado pelo datepicker original.
        var fixdisableDates = function () {

            var disableDates = [];

            if ($.isArray(options.disableDates) && (options.disableDates.length)) {

                // options.disableDates chega no formato de array, em que cada posição pode ser uma
                // data, ou um array com duas datas (inicial e final). Datas no formato DD/MM/YYYY.
                // Entretanto, o datepicker original recebe esse parâmetro de forma bem diferente,
                // como documentado em: http://freqdec.github.io/datePicker/#disabling-date-selection
                // Esse trecho de código é responsável pela transformação necessária
                $.each (options.disableDates, function (index, value) {

                    // Se esse valor é um array, entende-se como período [início, fim]
                    if ($.isArray(value)) {
                        // Transforma ["01/01/2000", "02/01/2000"] em { "20000101" : "20000102"}
                        disableDates[invertDate(value[0])] = invertDate(value[1]);

                    } else {
                        // Transforma "01/01/2000" em { "20000101" : 1}
                        disableDates[invertDate(value)] = 1;
                    }
                });
                options.disableDates = disableDates;
            }
        };

        /*
         * Instanciação do plugin que está sendo estendido (se for o caso).
         */

        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         */

        // O id do elemento onde será instanciado o datepicker
        elementId = element.attr("id");

        if (elementId) {

            // Adiciona classe necessária para transformação
            // e encapsula para usar a estrutura '.input-group' do Bootstrap como forma de
            // posicionar o calendário (ícone).
            element
                .addClass("datePicker")
                .wrap('<div class="input-group"></div>');

            // opts armazena os parâmetros de configuração dessa instância do datepicker
            opts = {
                formElements : {},
                highlightDays: [0,0,0,0,0,1,1], // S,T,Q,Q,S,S,D
                noFadeEffect: true
            };

            opts.formElements[elementId] = '%d/%m/%Y';

            // Adiciona limite inferior
            if (options.rangeLow) {
                opts.rangeLow = invertDate(options.rangeLow);
            }

            // Adiciona limite superior
            if (options.rangeHigh) {
                opts.rangeHigh = invertDate(options.rangeHigh);
            }

            // Define se será exibido da forma 'default' (false) ou 'inline' (true)
            opts.staticPos = (options.type === 'default' ? false : true );

            // Define dias (da semana) que estarão desabilitados
            if (options.disableDays) {
                fixdisableDays();
                opts.disabledDays = options.disableDays;
            }

            // Instancia o datepicker original com as opções correspondentes.
            datePickerController.createDatePicker(opts);

            // Define datas que estarão desabilitadas
            if (options.disableDates) {
                fixdisableDates();
                datePickerController.setDisabledDates(elementId, options.disableDates);
            }

            // Adiciona classe necessária para estrutura '.input-group'
            element.next('.date-picker-control').addClass('input-group-addon');

        // Se o id do element não está definido, não dá para fazer.
        } else {
            console.warn ('Datepicker não pode ser iniciado se o atributo "id" do input não for definido. ', element);
        }
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Datepicker', Datepicker);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Actionsbar */
/**
Transforma uma lista de links (ações) em um botão que, ao ser acionado, mostra essas ações.

A forma de exibição é controlada pelo parâmetro `type` e pode ser uma barra horizontal (bar) ou um dropdown.

@module Actionsbar
@attribute data-pic-actionsbar
@param {string} [type=bar] - Controla a aparência da lista de ações. Valores possíveis: bar|dropdown
@param {string} [label] - Insere rótulo no botão de start do actions bar, seja tipo bar ou dropdown.
@example
<ul data-pic-actionsbar>
    <li><a href="/sistema/acao1.do">Ação 1</a></li>
    <li><a href="/sistema/acao2.do">Ação 2</a></li>
    <li><a href="/sistema/acao3.do">Ação 3</a></li>
</ul>
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     */
//    var var1 = 1,
//        var2;

    /*
     * Tudo o que for necessário executar apenas uma vez, na carga da página
     * deve estar escrito aqui.
     * Se, por exemplo, o plugin que está sendo extendido expõe seus valores default
     * e é necessário modificar algum desses valores de forma geral,
     * isso deve ser feito aqui.
     */
    // $.fn.pluginOriginal.defaults.opcao = 'novo-valor';

    /*
     * Definição da classe
     */
    var Actionsbar = function (element, name, options) {

        /*
         * Variáveis de instância
         * Defina todas aqui antes de usar
         */
        var defaults,
            domains,
            enterKeyActive = false,
            widthBarraAcoes,
			isLarge;

        /*
         * Valores default
         */
        defaults = {
            type: 'bar',
			label: ''
        };

        /*
         * Domínios
         */
        domains = {
            type: ['bar', 'dropdown']
        };

        /*
         * Reúne todas as opções do plugin
         */
        options = PIC.collectOptions(element, name, options, defaults, domains);

        /*
         * Métodos públicos
         */

        // Destrói uma instância de Actionsbar, buscando retornar o código html ao seu original.
        this.destroy = function () {
		element.prev().remove();
            element.parent().parent().parent('tr').removeClass("active");
            element.unwrap('.barra-de-acoes');
            element.removeAttr('data-pic-active class style tabindex role aria-expanded aria-activedescendant aria-hidden');
            element.children().each(function () {
                $(this).removeAttr("id role tabindex");
                $(this).children().removeAttr("class data-placement");
            });
            // Desliga dos eventos associados ao namespace do plugin (nos filhos e no próprio element)
            element.find('*').addBack().off('.' + name);
            element.removeData('pic-' + name.toLowerCase());
        };

        /*
         * Métodos privados
         */
        var reconstruirListaBotoes = function() {
			element.each(function () {
				$(this).picActionsbar().destroy();
			});
			
			//@TODO verificar se não se deve trocar '[data-pic-datatable]' por element aqui
			PIC.activateWidget('Actionsbar', '[data-pic-actionsbar]');
        };
        
        $(document).ready(function($) {
            $(window).resize(function(){
				if(PIC.isXS($(window).width())){
					if(isLarge === false){
						reconstruirListaBotoes();
					}
					isLarge = true;
				}else{
					if(isLarge){
						reconstruirListaBotoes();
						isLarge = false;						
					}
				}
            });
       });		 
		 

        // Abre a barra de ações (animadamente!)
        var openBar = function (acionador) {

            // Se houver alguma outra barra aberta, fecha.
            // Somente uma barra aberta pode existir por vez.
            // @TODO Esse seletor foge dos princípios dos widget, em que uma instância deve afetar apenas a si mesmo.
            //       Entretanto, o desenvolvedor não conseguiu chegar a outra forma de fazer isso no momento.
            //       É de se avaliar se esse tipo de situação abre mesmo uma "brecha" no padrão,
            //       ou se esse código necessariamente precisa ser "corrigido".
            $('[data-pic-' + name.toLowerCase() + '][data-pic-active]').each(function () {
                if (!$(this).prev('.btn-ativar-lista-acoes').hasClass('fechado')) {
                    closeBar ($(this).prev('.btn-ativar-lista-acoes'));
                }
            });

            acionador.next().attr({
                "aria-expanded": "true",
                "aria-hidden": "false"
                });

            // @TODO revisar a linha a seguir
            // O fato é que: acionador.parent().parent().parent() alcança a 'tr' onde o actionsBar está contido
            // Isso foi feito para funcionar especificamente dentro de uma tabela, e será preciso dar uma solução mais genérica
            // O seletor 'tr' no último parent já foi adicionado como tentativa de dar uma solução mais genérica,
            // fazendo com que a classe seja aplicada somente se o contexto de uso for o esperado originalmente.
            acionador.parent().parent().parent('tr').addClass("active");

            acionador.children().removeClass("glyphicon-eye-open");
            acionador.children().addClass("glyphicon-eye-close");
            acionador.removeClass("fechado");
            acionador.next().css("display", "block");

            // Registra listener no document
            $(document).on('click.' + name + '.' + acionador.attr('id'), {'acionador': acionador}, closeMe);

            acionador.parent().animate({
                marginLeft: widthBarraAcoes * -1
            }, 200 );

            acionador.next().animate({
                marginRight: 4,
                opacity: 1
            }, 200 );
        };

        // Fecha a barra de ações indicada no evento.
        var closeMe = function (e) {
            //Rotina para fechar barra de ações quando existir click fora da barra de ações
            if(!$(e.target).closest('.barra-de-acoes').length) {
                if($('.barra-de-acoes').is(":visible")) {
                    if(e.data.acionador.hasClass("fechado") === false){
                        closeBar(e.data.acionador);
                    }
                }
            }
        };

        // Fecha a barra de ações (animadamente!)
        var closeBar = function (acionador) {
            acionador.next().attr("aria-expanded", "false");
            acionador.next().attr("aria-hidden", "true");

            // @TODO revisar a linha a seguir
            // Ver o que foi documentado acima, para o addClass correspondente
            acionador.closest('tr').removeClass("active");

            acionador.children().removeClass("glyphicon-eye-close");
            acionador.children().addClass("glyphicon-eye-open");
            //acionador.children().attr("aria-expanded", "false");

            //acionador.focus();
            // Remove listener do document
            $(document).off('click.' + name + '.' + acionador.attr('id'));

            acionador.parent().animate({
                marginLeft: 0
            }, 200 );

            acionador.next().animate({
                marginRight: widthBarraAcoes * -1,
                opacity: 0,
            }, 200, function() {
                $(this).css("display", "none");
                enterKeyActive = false;
            });

            enterKeyActive = true;
            acionador.addClass('fechado');
            acionador.focus();
        };

        // Alterna a visibilidade da barra de ações
        var toggleBar = function (acionador) {
            // Se a barra estiver fechada, abre
            if (acionador.hasClass("fechado")) {
                openBar(acionador);
            // Se a barra estiver aberta, fecha
            } else {
                closeBar(acionador);
            }
        };

        // Clique no acionador da barra
        // Alterna a visibilidade da barra e define o foco em uma ação da lista
        var clickAcionadorBar = function (e) {
            toggleBar ($(this));
            /*$(this).next().children().children().first().attr("tabindex", "0");
            $(this).next().children().children().first().focus();*/
            e.preventDefault();
            e.stopPropagation();
        };

        // Keydown no acionador da barra
        // Alterna a visibilidade da barra e define o foco em uma ação da lista
        var keydownAcionadorBar = function (e) {
            // @TODO revisar funcionamento dessa função
            // O código abaixo está fazendo o seguinte:
            // - Alterna a visibilidade da barra tanto com a tecla para cima quando para baixo
            //   Ou seja, com qualquer dessas teclas, abre se estiver fechado e fecha se estiver aberto
            // - Com a tecla para cima, foca a primeira opção; com a tecla para baixo, a última.
            //   Mas esse foco só faz sentido se estiver abrindo a barra, não fechando.
            //   Parece que é preciso definir o foco correto no caso de a barra ser fechada.
            if (e.which === key.up) {
                toggleBar($(this));
                $(this).next().children().children().last().focus();
                e.preventDefault();
            } else if (e.which === key.down) {
                toggleBar($(this));
                $(this).next().children().children().first().focus();
                e.preventDefault();
            } else if (e.which === key.enter) {
                if(enterKeyActive === false){
                    openBar($(this));
                    $(this).next().children().children().first().focus();
                    e.preventDefault();
                }
            }
        };

        // Keydown em um item de ação da barra
        // Controla a ação em foco e permite o fechamento da lista de ações
        var keydownItemBar = function (e) {
            var $this = $(this);
            if (e.which === key.right || e.which === key.down) {
                if ($this.next().index() >= 0) {
                    $this.parent().attr("aria-activedescendant", $this.attr("id"));
                    $this.children().attr("tabindex", "-1");
                    $this.next().children().attr("tabindex", "0");
                    $this.next().children().focus();
               }else{
                    $this.parent().children().first().children().attr("tabindex", "0");
                    $this.parent().children().first().children().focus();
               }
            } else if (e.which === key.left || e.which === key.up) {
                if ($this.prev().index() >= 0){
                    $this.parent().attr("aria-activedescendant", $this.attr("id"));
                    $this.children().attr("tabindex", "-1");
                    $this.prev().children().attr("tabindex", "0");
                    $this.prev().children().focus();
                }else{
                    $this.parent().children().last().children().attr("tabindex", "0");
                    $this.parent().children().last().children().focus();
               }
            } else if (e.which === key.esc) {
                closeBar($(this).parent().prev());
                e.stopPropagation();
            } else if (e.which === key.tab) {
                $(this).next().addClass("active");
                $(this).next().focus();
                $(this).children().removeClass("active");
            } else if (e.shiftKey) {
                $(this).children().removeClass("active");
                $(this).prev().addClass("active");
                $(this).prev().focus();
            }
        };

        // Keydown no acionador do dropdown
        // Alterna a visibilidade do dropdown e define o foco em uma ação da lista.
        var keydownAcionadorDropdown = function (e) {
            $(this).next().children().removeClass("active");
            $(this).next().children().children().attr("tabindex", "-1");
            if (e.which === key.up) {
                $(this).trigger('click.bs.dropdown');
                $(this).next().children().last().children().focus();
                $(this).next().children().last().addClass("active");
                $(this).next().children().last().children().attr("tabindex", "0");
                e.stopPropagation();
            } else if (e.which === key.down) {
               $(this).trigger('click.bs.dropdown');
                $(this).next().children().first().children().focus();
                $(this).next().children().first().addClass("active");
                $(this).next().children().first().children().attr("tabindex", "0");
            } else if (e.which === key.enter) {
                $(this).trigger('click.bs.dropdown');
                $(this).next().children().first().children().focus();
                $(this).next().children().first().addClass("active");
                $(this).next().children().first().children().attr("tabindex", "0");
            }
            $(this).children().removeClass("active");
        };

        // Keydown em um item de ação do dropdown
        // Controla a ação em foco e permite o fechamento da lista de ações.
        var keydownItemDropdown = function (e) {
            if (e.which === key.down || e.which === key.right) {
                if ($(this).next().index() >= 0) {
                    $(this).removeClass("active");
                    $(this).children().attr("tabindex", "-1");
                    $(this).next().children().focus();
                    $(this).next().addClass("active");
                    $(this).next().children().attr("tabindex", "0");
                }else{
                    $(this).parent().children().first().children().focus();
                    $(this).parent().children().last().removeClass("active");
                    $(this).parent().children().last().children().attr("tabindex", "-1");
                    $(this).parent().children().first().addClass("active");
                    $(this).parent().children().first().children().attr("tabindex", "0");
                }
                e.stopPropagation();
                e.preventDefault();
            } else if (e.which === key.up || e.which === key.left) {
                if ($(this).prev().index() >= 0){
                    $(this).removeClass("active");
                    $(this).children().attr("tabindex", "-1");
                    $(this).prev().children().focus();
                    $(this).prev().addClass("active");
                    $(this).prev().children().attr("tabindex", "0");
                }else{
                    $(this).parent().children().last().children().focus();
                    $(this).parent().children().first().removeClass("active");
                    $(this).parent().children().first().children().attr("tabindex", "-1");
                    $(this).parent().children().last().addClass("active");
                    $(this).parent().children().last().children().attr("tabindex", "0");
                }
                e.stopPropagation();
                e.preventDefault();
            } else if (e.which === key.esc) {
                $(this).parent().parent().removeClass("open");
                $(this).parent().prev().focus();
                $(this).removeClass("active");
            }
        };

        /*
         * Implementação do plugin
         */

        // Largura da barra de ações produto da quantidade de itens (ações)
		//widthBarraAcoes = (element.children('li').length * element.children('li').width());
		
        // Barra (a opção 'bar' não vale para telas XS)
        if (options.type === "bar" && !PIC.isXS($(window).width()) ) {
			if(element.parent().is("td")){
				element.parent().addClass("clearfix")
				widthBarraAcoes = element.parent().parent().actual("width");
			}else if(element.parent().is(".list-group-item")){
				element.parent().addClass("clearfix")
				widthBarraAcoes = element.parent().actual("width");
			}else{
				widthBarraAcoes = element.parent().actual("width")	
			};
			
            element.wrap('<div class="barra-de-acoes acoes" role="menubar"></div>');
            element.addClass("lista-de-acoes");
            element.attr({
                'role': 'menu',
                'aria-expanded': 'false',
                'aria-hidden': 'true'
            });
            element.css("margin-right", widthBarraAcoes * -1);

            // Para cada 'li', ou seja, cada opção dentro do actionsBar
            element.children()
                .addClass('btn-acao')
                .attr({
                    'role': 'menuitem',
                    //'tabindex': '-1'
                })
                .uniqueId();

            // Para cada filho de cada 'li'
            element.children().children()
                .addClass('btn btn-default')
                .attr({
                    //'data-toggle': 'tooltip',
                    //'data-placement': 'top',
                    'tabindex': '-1'
                });

            element.children().children().first()
                .attr({
                    'tabindex': '0'
                });				

            // Utiliza o valor do primeiro item da lista (primeira ação) como valor para aria-activedescendant
            element.attr('aria-activedescendant', element.children().first().attr('id'));

            element.parent().prepend("<a aria-haspopup=\"true\" class=\"btn btn-default btn-ativar-lista-acoes fechado\" title=\"Abrir barra de ações\" tabindex=\"0\">"+
									"<span class=\"glyphicon glyphicon-eye-open\"></span> "+options.label+"</a>");
            element.parent().children(".btn-ativar-lista-acoes").uniqueId();

            // Click no acionador da barra
            element.parent().children('.btn-ativar-lista-acoes').on('click.' + name, clickAcionadorBar);

            // Tecla pressionada no acionador da barra
            element.parent().children('.btn-ativar-lista-acoes').on('keydown.' + name, keydownAcionadorBar);

            // Tecla pressionada no acionador da barra (também)
            // @TODO Verificar se esse código é realmente necessário
            // element.parent().children('.btn-ativar-lista-acoes').on('keydown.' + name, function (e) {
                // if (e.keyCode === key.right) {
                    // $(this).next().children().children().first().focus();
                    // $(this).children().removeClass("active");
                    // return false;
                // } else if (e.keyCode === key.left) {
                    // return false;
                // } else if (e.keyCode === key.tab || e.shiftKey) {
                    // $(this).children().removeClass("active");
                // }
            // });

            // Tecla pressionada em um item da lista de ações.
            element.children('li').on('keydown.' + name, keydownItemBar);

        // Dropdown
        } else {
			if(element.parent().is("td")){
				element.parent().addClass("clearfix");
            }else if(element.parent().is(".list-group-item")){
				element.parent().addClass("clearfix")
			}
			
			element.wrap('<div class="barra-de-acoes btn-group" role="menubar"></div>');
            element.parent().css("float", "right");
            element.addClass("dropdown-menu dropdown-menu-right");
            element.attr({
                'role': 'menu',
                'aria-expanded': 'false'
            });

            // Para cada 'li', ou seja, cada opção dentro do actionsBar
            element.children()
                .addClass("btn-acao")
                .attr({
                    'role': 'menuitem'
                })
                .uniqueId()
                .children().attr({
                    'tabindex': '-1'
                });

            // Para cada filho de cada 'li'
            element.children().children().removeAttr("class");

            // Utiliza o valor do primeiro item da lista (primeira ação) como valor para aria-activedescendant
            element.attr('aria-activedescendant', element.children().first().attr('id'));
            element.parent().prepend("<a tabindex=\"0\" title=\"Abrir lista de ações\" class=\"btn btn-default dropdown-toggle\" data-toggle=\"dropdown\" aria-haspopup=\"true\">"+
									"<span class=\"glyphicon glyphicon-th-list\"></span> "+options.label+"</a>");

			var widthStartBrn = element.parent().actual("outerWidth");
            
			element.css("margin-right", widthStartBrn);
			
			// Keydown no acionador do dropdown e em item da lista de ações.
            element.parent()
                .on('keydown.' + name, '.dropdown-toggle', keydownAcionadorDropdown)
                .on('keydown.' + name, '.dropdown-menu li', keydownItemDropdown);

            element.parent()
                .on('click.' + name, '.dropdown-toggle', keydownAcionadorDropdown);
        }
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Actionsbar', Actionsbar);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Globalnav */
/**
Transforma uma lista (em um ou dois níveis) no menu global do seu sistema

Use `data-pic-state-current` no item de menu (`li`) que representa a página atual, seja um item
de primeiro (que não seja um agrupador) ou segundo nível.

@module Globalnav
@attribute data-pic-globalnav
@example
<ul data-pic-globalnav>
    <li>
        <a href="#">Funcionalidades do grupo A</a>
        <ul>
            <li data-pic-state-current><a href="#">Funcionalidade A1</a></li>
            <li><a href="#">Funcionalidade A2</a></li>
        </ul>
    </li>
    <li>
        <a href="#">Funcionalidades do grupo B</a>
        <ul>
            <li><a href="#">Funcionalidade B1</a></li>
            <li><a href="#">Funcionalidade B2</a></li>
        </ul>
    </li>
    <li>
        <a href="#">Funcionalidade C</a>
    </li>
</ul>
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Definição da classe
     */
    var Globalnav = function (element, name, jsOptions) {

        /*
         * Variáveis de instância
         */
        var group;

        /*
         * Métodos públicos
         */

        /**
         * Seta o item (`li`) informado como o item corrente (ativo) do menu.
         *
         * Se for informado um item de segundo nível, o primeiro nível é tratado automaticamente.
         *
         * @method setCurrent
         * @param li {mixed} - Item corrente. Pode ser informado como um seletor, um elemento ou um objeto jQuery.
         * @returns {boolean} Indica se foi possível (true) ou não (false) setar o item informado como o corrente.
         * @instance
         */
        this.setCurrent = function (item) {

            // Garante que o item seja um objeto jQuery, e apenas um.
            item = element.find(item).filter('li').first();

            // Se o item existe e não possui subitens
            if (item.length && item.has('ul').length === 0) {

                // Remove a classe active de qualquer 'li' que a possua
                element.find('li.active').removeClass('active');
                // Insere a classe 'active' no item encontrado.
                item.addClass('active');
                // Se a marca não está num item de primeiro nível (deve estar num de segundo)
                if (!item.closest('ul').is(element)) {
                    // Marca o pai também como active
                    item.parent().closest('li').addClass('active');
                }
                return true;
            }
            return false;
        };

        this.destroy = function () {

            // Desligando eventos
            element.children('li').off('keydown.' + name);
            group.find('li').off('keydown.' + name);
            $(document).off('click.' + name);

            // Remove o botão de acionamento em telas pequenas
            element.closest('#banner').find('.menuPrimario').remove();

            // Tentando voltar os tabindex ao padrão
            element.find('li').removeAttr('tabindex');
            element.find('li > a').removeAttr('tabindex');

            // Removendo classe 'active', inserida por setCurrent
            element.find('active').removeClass('active');

            // @TODO Em tese, deveríamos remover (destroy) do Dropdown Hover aqui. Como fazer?

            // Desligando o evento mouseover
            element.find('li').off('mouseover.' + name);

            element.closest('nav').removeAttr('aria-label');

            element.find('li').removeUniqueId();

            group.find('ul')
                .removeClass('dropdown-menu')
                .removeAttr('role aria-hidden')

            group.children('a')
                .removeClass('dropdown-toggle')
                .removeAttr('data-hover data-toggle data-delay role aria-expanded');

            group
                .removeClass('dropdown groupMenu')
                .removeAttr('aria-haspopup');

            // Removendo marca de item de menu
            element.find('li').removeAttr('role');

            element
                .removeClass('nav navbar-nav')
                .removeAttr('role')
                .removeAttr('aria-activedescendant');

            // Removendo div#menubar
            element.unwrap();
        };

        /*
         * Métodos privados
         */

        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         */

        element.wrap('<div id="menubar" class="collapse navbar-collapse navbar-left" role="application"></div>');

        element
            .addClass("nav navbar-nav")
            .attr({
                "role": "menubar",
                "aria-activedescendant": "0"
            });

        // Marcar item de menu (de forma geral)
        element.find('li').attr("role", "menuitem");

        // Marcar itens agrupadores
        // group são todos 'li' de primeiro nível que possuem 'ul'
        group = element.children('li').has('ul');

        group
            .addClass("dropdown groupMenu")
            .attr("aria-haspopup", "true");

        group.children('a')
            .addClass("dropdown-toggle")
            .attr({
                "data-hover":    "dropdown",
                "data-toggle":   "dropdown",
                "data-delay":    "1000",
                "role":          "button",
                "aria-expanded": "false"
            });

        // Listas que contém as opções de segundo nível
        group.find("ul")
            .addClass("dropdown-menu")
            .attr({
                "role":        "menu",
                "aria-hidden": "true"
            });

        /* Insere id's nos itens de menu */
        // Define id para todos os itens de menu (tanto primeiro quanto segundo nível)
        element.find('li').uniqueId();

        // Aplicação de atributos wai-aria
        element.closest("nav").attr("aria-label", "Menu de opções globais");

        // Se houver um item ativo, marca o atributo 'aria-activedescendant' com o id desse item
        // @TODO rever isso, já que não se usa mais a classe 'active' dessa forma.
        if (element.find('li ul li.active').length === 1) {
            element.attr('aria-activedescendant', element.find('li ul li.active').attr('id'));
        }

        element.find("li").on('mouseover.' + name, function(e) {
            element.attr("aria-activedescendant", $(this).attr("id"));
            e.stopPropagation();
        });

        /* Instacia Boostrap Dropdown Hover */
        element.find('.dropdown-toggle').dropdownHover();

        this.setCurrent('li[data-pic-state-current]');

        element.removeAttr("tabindex");
        element.find('li').removeAttr('tabindex');
        element.find('li > a').attr('tabindex', '-1');
        element.find(".dropdown-menu > li").removeAttr("tabindex");

        element.find("li").first().children("a").attr("tabindex", "0");

        // @TODO Atenção! Isso quebra um conceito principal dos widgets, que é não atuar em nenhum ponto além das fronteiras do elemento marcado.
        element.closest("#banner")
               .find(".nomeAplicacao")
               .after("<a class=\"navbar-toggle menuPrimario\" data-toggle=\"collapse\" data-target=\"#menubar\">" +
         "<span class=\"sr-only\">Mostrar Navegação Global</span>" +
         "<span class=\"glyphicon glyphicon-menu-hamburger\" aria-hidden=\"true\"></span></a>");

        /* Insere interação com teclado no menu */
        var submenu = false;

        // Para todos os itens de primeiro nível (sejam agrupadores ou não)
        element.children('li').on('keydown.' + name, function(e) {
            var keyCode = e.which;

            //right
            if (keyCode == key.right) {
                submenu = false;
                $(this).removeClass("open");
                $(this).children("a").attr("tabindex", "-1");
                $(this).next().children("a").attr("tabindex", "0");
                $(this).parent().attr("aria-activedescendant", $(this).attr("id"));

                if ($(this).next().index() == -1) {
                    $(this).parent().children().first().children("a").focus();
                } else {
                    $(this).next().children("a").focus();
                }
            //left
            } else if (keyCode == key.left) {
                submenu = false;
                $(this).removeClass("open");
                $(this).children("a").attr("tabindex", "-1");
                $(this).prev().children("a").attr("tabindex", "0");
                $(this).parent().attr("aria-activedescendant", $(this).attr("id"));

                if ($(this).index() === 0) {
                    $(this).parent().children().last().children("a").focus();
                } else {
                    $(this).prev().children("a").focus();
                }
            //enter - up - down
            } else if (keyCode == key.up || keyCode == key.down || keyCode == key.enter) {
                // Não afeta os items que não são agrupadores.
                if ($(this).hasClass('groupMenu')) {

                    if (submenu === false) {
                        //e.stopPropagation();
                        e.preventDefault();
                        $(this).addClass("open");
                        $(this).children("ul").children().first().children().attr("tabindex", "0");
                        $(this).children("ul").children().first().children().focus();
                    }
                }
            }
        });

        // Para todos os itens de segundo nível
        group.find("li").on('keydown.' + name, function(e) {
            var keyCode = e.which;

            //up
            if (keyCode == key.up) {
                submenu = true;
                e.stopPropagation();
                e.preventDefault();
                $(this).children().attr("tabindex", "-1");
                $(this).prev().children().attr("tabindex", "0");

                if ($(this).index() === 0) {
                    $(this).parent().children().last().children().focus();
                } else {
                    $(this).prev().children().focus();
                }
            //down
            } else if (keyCode == key.down) {
                submenu = true;
                e.stopPropagation();
                e.preventDefault();
                $(this).children().attr("tabindex", "-1");
                $(this).next().children().attr("tabindex", "0");

                if ($(this).next().index() == -1) {
                    $(this).parent().children().first().children().attr("tabindex", "0");
                    $(this).parent().children().first().children().focus();
                } else {
                    $(this).next().children().focus();
                }
            //esc
            } else if (keyCode == key.esc) {
                $(this).parent().parent().focus();
                $(this).parent().parent().removeClass("open");
            // tab
            } else if (keyCode == key.tab) {
                submenu = false;
                $(this).parent().parent().removeClass("open");
            }
        });

        //Fecha menus de acordo com o click fora da área do menu em telas pequenas
        $(document).on('click.' + name, function (event) {
            var clickover = $(event.target);
            var _target = "";

            element.find(".navbar-collapse").each(function() {
                var _opened = $(this).hasClass("in");
                var _target;
                if (_opened === true) {
                    _target = "#"+$(this).attr("id");
                }

                if (_opened === true && !clickover.hasClass("navbar-toggle") && clickover.parent().hasClass("dropdown") === false ) {
                    element.find("[data-target="+_target+"]").click();
                }
            });
        });
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Globalnav', Globalnav);

})(jQuery, window, document);
})();
/* Início de novo arquivo concatenado */
(function () {/* Localnav */
/**
Transforma uma lista (em um ou dois níveis) em um menu local.

Use `data-pic-state-current` no item de menu (`li`) que representa a página atual, seja um item
de primeiro (que não seja um agrupador) ou segundo nível.

@module Localnav
@attribute data-pic-localnav
@example
<ul class="navbar-collapse" data-pic-localnav>
    <li><a href="#">Funcionalidade de Primeiro Nível</a></li>
    <li><a href="#">Outra Funcionalidade como a Anterior</a></li>
    <li>
        <a href="#">Categoria Hipotética</a>
        <ul>
            <li><a href="#">Um item</a></li>
            <li><a href="#">Outro</a></li>
            <li><a href="#">E mais um da mesma categoria</a></li>
        </ul>
    </li>
    <li>
        <a href="#">Outra Categoria</a>
        <ul>
            <li><a href="#">Seja consistente</a></li>
            <li><a href="#">Agrupe adequadamente</a></li>
        </ul>
    </li>
    <li>
        <a href="#">Formas de Levantar as Categorias</a>
        <ul>
            <li><a href="#">Card Sorting</a></li>
            <li><a href="#">Focus Groups</a></li>
            <li><a href="#">Estudo do Negócio</a></li>
        </ul>
    </li>
</ul>
*/

;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     */

    /*
     * Sobrescrevendo os valores default do plugin que está sendo estendido.
     * Esses valores que servem para todas as instâncias do plugin.
     */
    $.fn.navgoco.defaults.cookie.expires = 10;

    /*
     * Definição da classe
     */
    var Localnav = function (element, name, jsOptions) {

        var options,
            count = 0,
            menuLateral,
            btnCollapse,
            btnExpander,
            comboMenuLateral,
            controles,
            scrollWatcher,
            toggled = false;

        /*
         * Colecionando as opções do plugin
         */
        options = PIC.collectOptions(element, name, jsOptions);

        /*
         * Métodos públicos
         */

        /**
         * Seta o item (`li`) informado como o item corrente (ativo) do menu.
         *
         * Se for informado um item de segundo nível, o primeiro nível é tratado automaticamente.
         *
         * @method setCurrent
         * @param li {mixed} - Item corrente. Pode ser informado como um seletor, um elemento ou um objeto jQuery.
         * @returns {boolean} Indica se foi possível (true) ou não (false) setar o item informado como o corrente.
         * @instance
         */
        this.setCurrent = function (item) {

            // Garante que o item seja um objeto jQuery, e apenas um.
            item = element.find(item).filter('li').first();

            // Se o item existe e não possui subitens
            if (item.length && item.has('ul').length === 0) {

                // Remove a classe active de qualquer 'li' que a possua
                element.find('li.active').removeClass('active');
                // Insere a classe 'active' no item encontrado.
                item.addClass('active');
                // Se a marca não está num item de primeiro nível (deve estar num de segundo)
                if (!item.closest('ul').is(element)) {
                    // Marca o pai também como active
                    item.parent().closest('li').addClass('active');
                    // Expande o pai para que o filho ativo seja mostrado.
                    element.navgoco('toggle', true, item.parent().data('index'));
                }
                return true;
            }
            return false;
        };

        this.destroy = function () {

            // Para de monitorar a scroll
            clearInterval(scrollWatcher);
            // Removendo comboMenuLateral
            comboMenuLateral.remove();
            // Removendo atributo aria
            element.closest('nav').removeAttr('aria-label');
            // Removendo controles
            controles.remove();
            // Removendo div.menu-ul
            element.unwrap();
            // Removendo div#menu-lateral
            element.unwrap();

            element.removeClass('system-nav collapse');
            // Removendo classe 'active', inserida por setCurrent
            element.find('active').removeClass('active');
            // Desliga listeners dos eventos associados ao namespace do plugin (nos filhos e no próprio element)
            element.find('*').addBack().off('.' + name);
            // Destrói o navgoco
            element.navgoco('destroy');
        }

        /*
         * Métodos privados
         */

        // Função que fecha (colapsa) o element se ele estiver aberto.
        var collapse = function () {
            if (element.hasClass('in')) {
                element.collapse('hide');
            }
        };

        var menu = function () {
            var countSubMenu = 0,
                countSubMenuVisivel = 0;

            element.find(" > li > ul").each(function () {
                countSubMenu++;

                if ($(this).parent().hasClass('open')) {
                    countSubMenuVisivel++;
                }
            });

            if (countSubMenu == countSubMenuVisivel) {
                btnCollapse.find("#collapseAll span").removeClass("glyphicon-eye-open");
                btnCollapse.find("#collapseAll span").addClass("glyphicon-eye-close");
                count = Number(countSubMenuVisivel);
            } else {
                btnCollapse.find("#collapseAll span").removeClass("glyphicon-eye-close");
                btnCollapse.find("#collapseAll span").addClass("glyphicon-eye-open");
                count = Number(countSubMenuVisivel);
            }

            if (countSubMenu === 0) {
                btnCollapse.find("#btn-collapse").css("display", "none");
            }
        };

        var windowSize = function () {

            var w = $(window).width();

            // @TODO O que é 754? trocar por uma função do PIC que teste isso (ixXS, talvez)
            if (w < 754) {
                if (toggled) {
                    $('#wrapper').removeClass('toggled');
                    $("#btn-expander").removeClass('minimizar');
                    toggled = false;
                }
            }
        };

        // Verifica se a altura necessária para o Localnav é maior
        // do que a altura disponível em tela para ele.
        // Fixa a altura do Localnav, se for necessário; e retorna true/false indicando
        // a presença ou não de scrollbar no Localnav.
        var hasScrollBar = function () {

            var menuUl = menuLateral.find('.menu-ul');

            var sideBarPaddingBottom = menuUl.css("padding-bottom");
            var sidebar = $('#pic-menu-local').length;
            /* If inserido para corrigo BUG momentaneamente, retirar posteiormente e corrigir BUG */
            if(sidebar !== 0){
                var vlrPadding = parseInt(sideBarPaddingBottom.replace("px", ""));
                var sideBarTop = $("#pic-menu-local").css("top");
                sideBarTop = sideBarTop.replace("px", "");
                var alturaJanela = $(window).height();

                //Caso a área seja maior que 768 a altura da scroll do sidebar é controlada dinamicamente
                // @TODO Usar função PIC.isXS() aqui.
                if ($(window).width() > 768) {
                    menuUl.css("height", $(window).height() - sideBarTop - $(".rodape").innerHeight());
                } else {
                    menuUl.css("height", "auto");
                }
                return menuUl.get(0).scrollHeight > menuUl.height() + vlrPadding;
            }
        }

        /*
         * Instanciação do plugin que está sendo estendido.
         */
        options.onClickAfter = menu;

        element.navgoco(options);

        this.setCurrent('li[data-pic-state-current]');

        /*
         * Implementação do plugin (o que o plugin faz ou estende ao comportamento de outro)
         */

        // Click no document (click fora de localNav) fecha o element.
        $(document).click(collapse);

        $(document).ready(windowSize);

        $(window).resize(windowSize);

        element.addClass('system-nav collapse');

        //Cria a marcação necessária para apresentação do botão de expansão e retração
        // @TODO verificar como remover esse id daqui
        element.wrap('<div id="menu-lateral"></div>');
        menuLateral = element.parent();
        element.wrap('<div class="menu-ul"></div>');
        menuLateral.append('<div class="controles-navgoco"></div>');
        controles = menuLateral.children('.controles-navgoco');
        controles.append('<div id="btn-expander"><a data-placement="right" title="Minimizar"><span class="glyphicon glyphicon-arrow-left"></span></a></div>');
        controles.append('<div id="btn-collapse"><a data-placement="right" href="#" id="collapseAll"><span class="glyphicon glyphicon-eye-open"></span></a></div>');
        btnCollapse = controles.children('#btn-collapse');
        btnExpander = controles.children('#btn-expander');

        //Aplicação de atributos wai-aria
        element.closest("nav").attr("aria-label","Menu de opções locais");

        menuLateral.closest("nav").prepend('<button type="button" class="navbar-toggle comboMenuLateral" data-toggle="collapse" data-target=":parent .system-nav"> <span class="sr-only">Abrir menu de opções locais</span> <span class="glyphicon glyphicon-menu-hamburger"></span>Opções Locais</button>');
        comboMenuLateral = menuLateral.closest('nav').find('.comboMenuLateral');

        //Para telas pequenas o menu se inicia fechado
        if (PIC.isXS($(window).width())) {
            element.find("li").each(function () {
                if ($(this).hasClass("open")) {
                    $(this).removeClass("open").children("ul").css("display", "none");
                }
            });
        }

        //Adicionar e remove scrool no menu quando sua altura ultrapassa a altura da janela
        scrollWatcher = setInterval(function () {
            if (hasScrollBar()) {
                element.addClass('scrollAtiva');
            } else {
                element.removeClass('scrollAtiva');
            }
        }, 200);

        //Adiciona classe active ao botão que ativa e desativa o menu
        comboMenuLateral.on('click.' + name, function () {
             $(this).toggleClass("active");
        });

        //Associa o listener à ação de click e controla a ação
        btnCollapse.find("#collapseAll").on('click.' + name, function (e) {
            e.preventDefault();
            count++;

            if (count % 2 === 0) {
                if ($(this).children().attr("class") == "glyphicon glyphicon-eye-close") {
                    $(this).children().removeClass("glyphicon-eye-close").addClass("glyphicon-eye-open");
                }
                element.navgoco('toggle', false);
            } else {
                if ($(this).children().attr("class") == "glyphicon glyphicon-eye-open") {
                    $(this).children().removeClass("glyphicon-eye-open").addClass("glyphicon-eye-close");
                }
                element.navgoco('toggle', true);
            }
        });

        //Associa o listener à ação de click e controla a ação
        btnExpander.on('click.' + name, function () {
            $(this).toggleClass('minimizar');
            $('#wrapper').toggleClass('toggled');
            if ($('#wrapper').hasClass('toggled')) {
                toggled = true;
            } else {
                toggled = false;
            }
        });
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Localnav', Localnav);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Adaptableheader */
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     */

    /*
     * Definição da classe
     */
    var Adaptableheader = function (element, options) {

        /*
         * Variáveis de instância
         */
        var windowWidth = $(window).width();
        /*
         * Métodos privados
         */
        var toggleMenuState = function () {
                var currentWindowScroll = $(window).scrollTop(),
                    adaptingHeight = element.find("#cabecalho").height() + 
										 element.find("#pic-menu-global").height() + 10,
                    wrapper = element.closest("#wrapper");

                if (currentWindowScroll > adaptingHeight) {
					
                    if ( !wrapper.hasClass("menuGlobalReduzido")) {
                        wrapper.addClass("menuGlobalReduzido");
						
                        if (element.find("#pic-menu-global").length === 0) {

							wrapper.find("header")
								   .append('<div id="pic-menu-global-fake">&nbsp;</div>');
                        }
                    }
                } else {
					
					wrapper.removeClass("menuGlobalReduzido");
                    wrapper.find("#pic-menu-global-fake").remove();
                }
            };

        /*
         * Implementação do plugin
         */
        if (PIC.isMD(windowWidth) || PIC.isLG(windowWidth)) {
            $(window).scroll(toggleMenuState);
        }
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Adaptableheader', Adaptableheader);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {/* Themes */
/**
Cria toda a estrutura e funcionamento do seletor de temas do PIC no cabeçalho

Depende apenas da existência do elemento de classe `.topoAplicacao` dentro do elemento `header`.
Verifica a existência dos elementos antes de criá-los

@module Themes
*/
;(function ($, window, document, undefined) {

    'use strict';

    /*
     * Variáveis globais
     * no escopo da closure
     */
    var requiredParent = $('header .topoAplicacao');


    /*
     * Executa apenas uma vez, na carga da página
     */

    /*
     * Definição da classe
     */
    var Themes = function (element, name, jsOptions) {

        /*
         * Variáveis de instância
         */
		var suporteGlobal,
			funcoesGlobais,
			seletorTemas;
		
        /*
         * Métodos privados
         */
        var construirElementosuporteGlobal = function () {
			return $('<div class="suporteGlobal"></div>');
        };
        var construirElementoFuncoesGlobais = function () {
			return $('<ul class="funcoesGlobais"></ul>').addClass("collapse");
        };
        var construirElementoSeletorTemas = function () {
			var agrupadorTemas,
				triggerTemas,
				listaTemas;
			agrupadorTemas = $('<li class="dropdown temas"></li>');
			triggerTemas = $('<a href="#" class="dropdown-toggle" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="false">' +
							 '<span class="glyphicon glyphicon-tint" aria-hidden="true"></span>' +
							 '<span class="letra">Temas</span>' +
							 '</a>');
			listaTemas = $('<ul class="dropdown-menu dropdown-menu-right" role="menu" aria-labelledby="dropdownMenu1">' +
						   '<li><a href="#" class="btnAlteraTema" id="tema_amarelo">Amarelo</a></li>' +
						   '<li><a href="#" class="btnAlteraTema" id="tema_azul">Azul</a></li>' +
						   '<li><a href="#" class="btnAlteraTema" id="tema_camaranet">Camaranet</a></li>' +
						   '<li><a href="#" class="btnAlteraTema" id="tema_verde">Verde</a></li>' +
						   '<li><a href="#" class="btnAlteraTema" id="tema_vermelho">Vermelho</a></li>' +
						   '</ul>');
			agrupadorTemas.append(triggerTemas);
			agrupadorTemas.append(listaTemas);
			return agrupadorTemas;
        };
		var configurarComportamento = function() {

			var switch_style = {
				onReady: function () {
				  this.switch_style_click();
				},

				switch_style_click: function(){
					$(".btnAlteraTema").click(function(){
						var id = $(this).attr("id");

						YUI().use('cookie', function(Y) {
							Y.Cookie.set("id", id, { expires: new Date("January 12, 2025") });
						});

						$("#themePic").attr("href", pathPic+"css/"+id+".css");
					});
				}
			};

			//Cookie
			$().ready(function () {
				YUI().use('cookie', function(Y) {
					var value = Y.Cookie.get("id");
					if (!!value) {
						Y.Get.css(pathPic+ 'css/' +value+ '.css', {
							attributes: { 'id':'themePic'}},
							function (err) {
							if (err) {
								Y.log('Error loading CSS: ' + err[0].error, 'error');
								return;
							}
							Y.log('Tema ' + value + ' carregado...');
						});
					} else {
						Y.Get.css(pathPic+ 'css/tema_camaranet.css', {
							attributes: { 'id':'themePic'}},
							function (err) {
							if (err) {
								Y.log('Error loading CSS: ' + err[0].error, 'error');
								return;
							}

							Y.log('Tema Camaranet carregado...');
						});
					}
					//Altera display do body para block apresentando conteúdo
					$("body").css("display", "block");
				});

				switch_style.onReady();
			});
		};

        /*
         * Implementação do plugin
         */
		
		//verifica se há o ancestral necessário para a estrutura
		if(requiredParent.length !== 0) {
			//verifica se já existe e cria, se necessário, o elemento .suporteGlobal e o adiciona ao final (append)
			if(requiredParent.find('.suporteGlobal').length===0) {
				suporteGlobal = construirElementosuporteGlobal();
				requiredParent.append(suporteGlobal);
			}
			suporteGlobal = requiredParent.find('.suporteGlobal');
			//verifica se já existe e cria, se necessário, o elemento .funcoesGlobais em .suporteGlobal e o adiciona ao final (append)
			if(suporteGlobal.find('.funcoesGlobais').length===0) {
				funcoesGlobais = construirElementoFuncoesGlobais();
				suporteGlobal.append(funcoesGlobais);
			}
			funcoesGlobais = suporteGlobal.find('.funcoesGlobais');
			//verifica se já existe e cria, se necessário, o elemento .dropdown.temas em .funcoesGlobais e o adiciona ao final (append)
			if(funcoesGlobais.find('.dropdown.temas').length===0) {
				seletorTemas = construirElementoSeletorTemas();
				funcoesGlobais.append(seletorTemas);
			}
			seletorTemas = funcoesGlobais.find('.dropdown.temas');
			seletorTemas.find('[data-toggle=dropdown]').dropdownHover();
		}
		//Chama função que controla o estado dos cookies e aciona o tema selecionado
		configurarComportamento();
    };

    /*
     * Solicita o registro do plugin
     */
    PIC.pluginRegister ('Themes', Themes);

})(jQuery, window, document);

})();
/* Início de novo arquivo concatenado */
(function () {;(function ($) {
        /* **
         * Snippety plugin
         * Inserts snippets in your page according to the references informed in anchors.
         * It replaces the anchor by the snippet itself.
         * 
         * Usage:
         * 1. Create a complete html file that contains the html snippet you want.
         * 2. Mark down the snippet with the attribute data-pic-doc="snippet".
         * 3. On the html page where do you want to insert the snippet, create an anchor that refers to the snippet file.
         * 4. Activate the plugin using $(my-anchor-selector).snippety(); Example: $(".snippet").snippety();
         *
         * Options:
         * 1. showSourceCode
         *    - false (default): inserts the snippet into your page.
         *    - true: inserts the snippet source code into your page (inside a "pre" tag).
		 * 2. callback
		 *    - function reference: use to run any code after snippety returns succesfully
         */
    'use strict';
    $.fn.snippety = function (options) {
            
            var settings = $.extend({
                // These are the defaults.
                showSourceCode: false,
				callback: function () {}
            }, options );
            
            
            this.each(function () {
                
                // Snippet file URL
                var fileURL = $(this).attr("href");
                // Element that will be replaced by the snippet (i.e, the link);
                var placeholder = $(this);
                
                $.get(fileURL, function (data) {
                    
                    // Gets code snippet inside the file.
                    var snippet = $(data).filter("[data-pic-doc='snippet']").get(0);
                    var snippetSourceCode;
                    
                    // Clean up this control attribute.
                    snippet.removeAttribute("data-pic-doc");
                    
                    // If user want to show snippet source code.
                    if (settings.showSourceCode) {
                        
                        // Replace placeholder by an empty "pre" tag.
                        placeholder = $("<pre class='snippety-source'></pre>").replaceAll(placeholder);
                        // Put source code into the "pre" tag.
                        placeholder.text( $(snippet).wrap("<div/>").parent().html() );
                    }
                    // If user want to append snippet.
                    else {
                        // Replace placeholder element (the link) by the snippet.
                        placeholder.replaceWith(snippet);
                    }
					settings.callback();
                })
                .fail(function () {
                    console.warn("There was a problem openning file \"" + fileURL + "\". Please, check the used reference.");
                    placeholder.replaceWith("");
                });
                
            });
            
            return this;
        };
        
}) (jQuery);

})();
/* Início de novo arquivo concatenado */
(function () {/* CSS Animation */

var classe = "";
var intervalo;

$("[data-efect-start=true]").each(function () {
	clearInterval(intervalo);
	var $obj = $($(this).data("obj"));
	efeito = $(this).data("efect");

	if($obj.hasClass(efeito)){
		$obj.removeClass(efeito);
	}

	$obj.removeClass(classe).addClass($(this).data("efect"));
	$obj.addClass("block");
	classe = efeito;

	if($(this).data("clear")){
		intervalo = setTimeout(function(){
			$obj.removeClass(classe);
		},$(this).data("clear"));
	}
});

$(".btn-efect-start").click(function(){
	clearInterval(intervalo);
	var $obj = $($(this).data("obj"));
	efeito = $(this).data("efect");

	if($obj.hasClass(efeito)){
		$obj.removeClass(efeito);
	}

	$obj.removeClass(classe).addClass($(this).data("efect"));
	$obj.addClass("habilitar");
	classe = efeito;

	if($(this).data("clear")){
		intervalo = setTimeout(function(){
			$obj.removeClass(classe);
		},$(this).data("clear"));
	}
});
	
function iniciarAnimacao(obj, efect, timeEfect, efectDel, timeEfectDel){
	var $obj = $(obj);
	efeito = efect + " animated";
	efectDel = efectDel + " animated";
				
	var efectDelTimer;
	var loadEfectDel = function() {
		if(efectDel){
			$obj.removeClass(efectDel);
		}
	};		
	efectDelTimer = setTimeout(loadEfectDel, timeEfectDel);	
	
	var efectInitTimer;
	var loadEfect = function() {
		$obj.addClass(efeito);
	};			
	efectInitTimer = setTimeout(loadEfect, timeEfect);
}

})();
/* Início de novo arquivo concatenado */
(function () {/* Custom Geral */
/* Insere carimbo relativo ao ambiente - Candidato a Plugin de Ambiente  */
var nomeAmbiente = $("body").attr("data-pic-ambiente");
var carimboAmbienteTimer;
var listaAmbientesValidos = ["desenvolvimento","homologação","teste","prototipação"];

if($.inArray(nomeAmbiente.toLowerCase(),listaAmbientesValidos) >= 0) {
    $("body").addClass("comSeloAmbiente");
    $("#cabecalho").append("<div class=\"seloAmbiente\">"+nomeAmbiente+"</div>");

    clearTimeout(carimboAmbienteTimer);
    carimboAmbienteTimer = setTimeout(function() {
        						$(".seloAmbiente").addClass("posFinal");
    						}, 600);
}


/* Suporte para Prototipagem: inclusão de snnipets comuns as páginas */
/*    Funciona somente para o ambiente de prototipação */
//Inclusão dos menus local e global
if (nomeAmbiente.toLowerCase() === "prototipação") {
	var triggerElement = $("body[data-pic-snippets]");
	var snippetsList = $.isArray(triggerElement.data("picSnippets")) ? triggerElement.data("picSnippets") : [];
	var globalnav = $("header [data-pic-globalnav]");

	if(globalnav.length === 0) {
		$('body').attr("class", "semMenuSuperior"); //marca o body, por default, como página sem menu
	}

	if(snippetsList.length!==0) { // A página foi marcada - corretamente - para receber snippets

		//Obter snippets de menu local se a página estiver marcada para tanto
		if($.inArray("localnav",snippetsList) >= 0) {
			if($("[data-pic-localnav]").length === 0) {
				triggerElement.find("#banner")
							  .after("<a class=\"localnav-source\" href=\"snippet-menulocal.html\"></a>");
				triggerElement.find(".localnav-source")
							  .snippety(
								{callback:function() {
									$("#page-content-wrapper").removeClass("sidebar-off");
									PIC.activateWidget("Localnav");
								}}); 
			}
		}

		//Obter snippets de menu global se a página estiver marcada para tanto
		var base = $.grep(snippetsList, function(elemento){
			 if ($.isPlainObject(elemento)) {
				 return elemento.base;
			 };
		});
		base = base.length > 0 ? base.pop("base").base : "";
		if($.inArray("globalnav",snippetsList) >= 0) {
			if($("[data-pic-globalnav]").length === 0) {
				triggerElement.find("#banner #cabecalho")
							  .after("<a class=\"globalnav-source\" href=\"" + base + "/snippet-menuglobal.html\"></a>");
				triggerElement.find(".globalnav-source")
							  .snippety(
								{callback:function() {
									$("body").removeClass("semMenuSuperior");
									PIC.activateWidget("Globalnav");
								}}); 
			}
		}
	}
}
// Verifica se existe sidebar e avisa (marca) a área de conteúdo principal
var sidebar = $('#pic-menu-local');
if(sidebar.length === 0){
    $('#page-content-wrapper').addClass("sidebar-off");
}

//Botão do Menu de Suporte GLobal (ex-configurações) em telas pequenas
$(".suporteGlobal").prepend("<a class=\"navbar-toggle button linkInfo\"" + 
							"data-toggle=\"collapse\" data-target=\".funcoesGlobais\">" +
							"<span class=\"sr-only\">Menu de Suporte Global </span>" +
							"<span class=\"glyphicon glyphicon-cog\" aria-hidden=\"true\"></span></a>");

//Cria elemento .funcoesGlobais e botões para acionar os itens de lista
$(".suporteGlobal>ul").addClass("funcoesGlobais collapse");
//Todo .menuSuporte é um menu dropdown e suas uls são seus itens
$(".suporteGlobal .menuSuporte").addClass("dropdown");
$(".menuSuporte>a").addClass("dropdown-toggle")
				   .attr({'data-toggle': 'dropdown','aria-expanded':'false'});
$(".menuSuporte>ul").addClass("dropdown-menu dropdown-menu-right")
					.attr("role","menu");


//Configura id dos menus conhecidos do PIC e casa os ids com os labeledby
$(".menuConfiguracoes>a").attr("id","dropdownMenuConfiguracoes");
$(".menuNotificacoes>a").attr("id","dropdownMenuNotificacoes");
$(".menuSuporte>ul").each( function() {
	$(this).attr("aria-labelledby", $(this).prev().attr("id"));
									});

//Criar ícones pré-definidos nos elementos dos menus de suporte global
$(".suporteGlobal .usuario").prepend("<span class=\"glyphicon glyphicon-user\" aria-hidden=\"true\"></span>");

$(".suporteGlobal .menuConfiguracoes .dropdown-toggle").prepend("<span class=\"glyphicon glyphicon-cog\" aria-hidden=\"true\"></span>");


// Bootstrap Hover Dropdown JS - Necessário para o funcionamento de dropdown 
$('.dropdown-toggle').dropdownHover(); 


/* Input Validate - candidata a reforçar a API do Validation.js */
highlightErrorField = function(id, msg){
    var $id = $(id);

    $id.attr("data-description", msg);
    $id.attr("tabindex", "0");
    $id.attr("data-validate", "notBlank");
    $id.attr("aria-invalid", "true");
    $id.attr("aria-describedby", id.replace("#", "")+"-feedbackMsg");
    $id.addClass("errorField");
    $id.parent().append("<span id=\""+id.replace("#", "")+"-feedbackMsg\" class=\"feedbackMsg error\" tabindex=\"-1\"><span style=\"font-family: FontAwesome; font-size: 16px;\" class=\"FontAwesome\" aria-hidden=\"true\"></span> Importante:" + msg +"</span>");
}

/* Ativa todos os plugins do PIC */
PIC.activateWidget('Adaptableheader', $('#banner'), null, true);
PIC.activateWidget('Themes', $('header'), null, true);
PIC.activateAllWidgets();   

})();