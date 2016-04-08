/* 
 * Responsabilidades:   
 *                1 - Identificar o caminho para a instalação PIC desejada
 *                2 - Baixar as bibliotecas Jquery e Jquery UI do PIC
 *                3 - No sucesso, baixar a biblioteca Bootstrap do PIC
 *                4 - Baixar todas as bibliotecas JS dos plugins extras usados pelo PIC
 *                5 - Baixar todas as biblotecas CSS dos plugins extras usados pelo PIC
 *                6 - Baixar todas as bibliotecas CSS do PIC customizando plugins
 *                7 - Baixar o CSS do tema básico
 *                8 - Baixar o mecanismo de instanciação dos controles de plugins (renderização PIC)
*/

//Esconde página até todo js e css ser carregado;
document.body.style.display = 'none';

//Encontra o caminho onde reside a biblioteca PIC utilizada
var scriptTags = document.getElementsByTagName('script');

var scriptsLocais = "";

var lastScriptSrc = (function () { 
                        for(i=0;i<scriptTags.length;i++) {
                            if(scriptTags[i].src.indexOf("js/load-control.js")!=-1) {
                                picLoadControl = scriptTags[i].getAttribute("data-pic-customscripts")
                                scriptsLocais = picLoadControl ? picLoadControl : "";
                                return scriptTags[i].src;
                            }
                        };
                        return "";
                    })();
var globalFolderPosition = lastScriptSrc.indexOf("pic"); //TODO: buscar somente o path do load-control.js
var pathPic = lastScriptSrc.substr(0, globalFolderPosition)+'pic/';


// Create a new YUI instance and populate it with the required modules.
YUI().use('get', function (Y) {
	// Get is available and ready for use. Add implementation
	// code here.	
	
	/* jQuery - jQuery UI */
	Y.Get.load(pathPic+'js/jquery-1.9.1.min.js',
	{onSuccess: function () {
		Y.log('jQuery 1.9.1 carregado...');
	}}, 
        //Todas as outras cargas somenet são executadas se o jquery retornou com sucesso
        function (err) {    
		if (err) {
			Y.log('Error loading JS: ' + err[0].error, 'error');
			return;
		};
		/* Fim da carga do Jquery e JqueryUI */	
		
		/* Bootstrap JS e Bootstrap custom JS */
		Y.Get.load(pathPic+'js/bootstrap.min.js', 
		{onSuccess: function () {
			Y.log('Bootstrap carregado...');
		}}, function (err) {
			if (err) {
				Y.log('Error loading JS: ' + err[0].error, 'error');
				return;
			}
		});
		/* Fim da carga do Bootstrap */	
		
		/* Carga de todas as bibliotecas extras de plugins do PIC */
		Y.Get.js(pathPic+'js/pic.allplugins.js', {
			onFailure: function () {
				Y.log('Bibliotecas extras de plugins PIC: Carregamento cancelado...');
			}, 
			onSuccess: function () {
			
				/* Verifica se o browser é IE e sua versão */
				var IE = $.browser.msie === true && $.browser.versionNumber === 7 ? true : false;
				
				if(IE){
					$('body').css("display", "block");
					$('body').html("<div style=\"margin: 20px\" align=\"center\"><div style=\"width: 60%;\" class=\"alert alert-danger\" role=\"alert\">"+
									"<p align=\"left\"><strong>Seu navegador não é suportado por essa aplicação.</strong></p>"+
									"<p align=\"left\">Você parece estar usando o Internet Explorer versão 7.0 (ou anterior). Atualize seu Internet Explorer para uma versão mais atual, ou utilize outro navegador mais moderno.</p>"+
									"</div></div>");
				};
			
				Y.log('Bibliotecas extras de plugins PIC carregadas');
			}}, function (err) {
				if (err) {
					if(err[0].error != "Aborted"){ 
						Y.log('Bibliotecas extras de plugins PIC: ' + err[0].error, 'error');
					};
				return;
			};
		});
		/* Fim da carga das bibliotecas extras de plugins PIC  */
		
		/* Carga de todas as bibliotecas de CSS dos plugins */
		/* Carga de todas as bibliotecas de CSS do PIC customizando plugins */
        /* Tema Básico*/
        /* O objeto Get garante a carga em paralelo*/
		Y.Get.css([pathPic+'css/pic.allplugins.css'], {
			onFailure: function () {
				Y.log('CSS dos plugins: Carregamento cancelado...');
			},  
			onSuccess: function () {
				Y.log('CSS dos plugins carregado');
			}}, function (err) {
				if (err) {
					if(err[0].error != "Aborted"){
						Y.log('CSS dos plugins: ' + err[0].error, 'error');
					};
					return;
				}			
			});
		Y.Get.css([pathPic+'css/pic.allcustoms.css'], {
			onFailure: function () {
				Y.log('CSS dos plugins: Carregamento cancelado...');
			},  
			onSuccess: function () {
				Y.log('CSS dos plugins carregado');
			}}, function (err) {
				if (err) {
					if(err[0].error != "Aborted"){
						Y.log('CSS dos plugins: ' + err[0].error, 'error');
					};
					return;
				}			
			});
		Y.Get.css([pathPic+'css/tema_basico.css'], {
			onFailure: function () {
				Y.log('CSS dos plugins: Carregamento cancelado...');
			},  
			onSuccess: function () {
				Y.log('CSS dos plugins carregado');
			}}, function (err) {
				if (err) {
					if(err[0].error != "Aborted"){
						Y.log('CSS dos plugins: ' + err[0].error, 'error');
					};
					return;
				}			
			});
		/* Fim da carga de todas as bibliotecas de CSS  */			
		
		/* Custom JS Global */
		Y.Get.js(pathPic+'js/pic.allcustoms.js', {
			onFailure: function () {
				Y.log('Custom JS Global: Carregamento cancelado...');
			},  
			onSuccess: function () {
				/* Respond e HTML5shiv */
				if($.browser.msie){
					if($.browser.versionNumber === 8){
						Y.Get.js([pathPic+'js/respond.js', 
								pathPic+'js/html5shiv.min.js'], {
							onFailure: function () {
								Y.log('Respond.js e HTML5shiv: Carregamento cancelado...');
							},  
							onSuccess: function () {
								Y.log('Respond.js e HTML5shiv carregado...');
							}}, function (err) {
								if (err) {
									if(err[0].error != "Aborted"){
										Y.log('Respond.js e HTML5shiv: ' + err[0].error, 'error');
									};
									return;
								}			
							});
					}
				}
				Y.log('Custom JS Global carregado');
				/* --- */			
				/* Pilha de scripts personalizados da página */
				if (scriptsLocais.length) {
					scriptsLocais = scriptsLocais.split(",");
					Y.Get.js(scriptsLocais, {
						onFailure: function () {
							Y.log('Custom JS Local: Carregamento cancelado ou arquivo inexistente.');
						},  
						onSuccess: function () {
							Y.log('Custom JS Local carregado');
						}}, 
						function (err) {
							if (err) {
								if(err[0].error != "Aborted" && err[0].error != "Failed to load arquivos de script locais"){
									Y.log('Scripts Locais: ' + err[0].error, 'error');
								}else if(err[0].error == "Failed to load"){
									Y.log('Arquivos de scripts locais não encontrados');
								};
								return;
							};
						});
				}
			
			}}, function (err) {
				if (err) {
					if(err[0].error != "Aborted"){
						Y.log('Custom JS Global: ' + err[0].error, 'error');
					};
					return;
				}

				/* Se browser for IE e da versão 8.0 não implementa display block no body do documento */
				var IE = $.browser.msie === true && $.browser.versionNumber === 8 || $.browser.versionNumber === 7 ? true : false;
				
				if(!IE){
					document.body.style+="display:block;";
				};
			});
		/* Fim do Custom JS Global */
		

	});
	/* Fim jQuery */
});
