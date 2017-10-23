var f7 = new Framework7({
    material: true,
    statusbarOverlay: false,
    scrollTopOnStatusbarClick: true,
    cache: false,
    notificationCloseIcon: false
});

var $$ = Dom7;

var mainView = f7.addView('.view-main', {});

$$(document).on('ajaxStart', function(e) {
    f7.showPreloader('Chargement...');
});

$$(document).on('ajaxComplete', function() {
    f7.hidePreloader();
});

if (f7.device.android) {
    window.oncontextmenu = function(event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    };
}

var isStandalone = window.matchMedia('(display-mode: standalone)').matches;

if (f7.device.android && !isStandalone) {
    var stopName = $('.center').text();
    var html = '<div class="content-block">' +
        '<p>Pour installer un raccourci pour l\'arrêt ' +
        '<strong>' +
        stopName +
        '</strong>' +
        ' :</p>' +
        '<ul class="tutorial">' +
        '<li>' +
        '<div class="step-number">1</div>' +
        '<p>Appuyez sur le bouton <strong>Plus <i class="more"></i></strong> tout en haut à droite de l\'écran</p>' +
        '</li>' +
        '<li>' +
        '<div class="step-number">2</div>' +
        '<p>Sélectionnez <strong>Ajouter à l\'écran d\'accueil</strong></p>' +
        '<img src="/resources/img/ath.png" alt="Ajouter à l\'écran d\'accueil">' +
        '</li>' +
        '</ul>' +
        '</div>';

    $$('.left').remove();
    $$('.center').text('TPGwidget');
    $$('.page-content').html(html);
    $$('.page-index').removeClass('layout-dark');
} else {
    $.ajax({
        url: "/ajax/ajaxprochainsdeparts.php?id=" + $$(".page-index").attr('data-page').split("-")[1],
        cache: false,
        success: function(result) {
            $$('.page-content').html(result);
            $$('.page-index').removeClass('layout-dark');
        },
        error: function() {
            $$('.preloader').addClass("smileyErreur");
            $$('.preloader').removeClass("preloader");
            $$('.preloader-white').removeClass("preloader-white");
            $$('.graym').append("<span>Impossible de se connecter au serveur TPGwidget</span>");
            $$('.graym h2').html("Erreur");
        }
    });

    $$(document).on('pageBeforeAnimation', function(e) {
        f7.closeNotification(".notifications");

        var page = e.detail.page;
        var p = page.name.split("-");

        if (p[0] == 'infotraffic') {
            $$('.pull-to-refresh-content').on('refresh', function(e) {
                $.ajax({
                    url: "/ajax/ajaxperturbations.php",
                    cache: false,
                    success: function(result) {
                        $$('#perturbations-all').html(result);
                        f7.pullToRefreshDone();
                    }
                });
            });
        }

        function changeStatusbarColor(color){
            $('meta[name=theme-color]').remove();
            $('head').append('<meta name="theme-color" content="'+color+'">');
        }

        if(p[0] == 'depart'){
            changeStatusbarColor('#'+p[1]);
        } else if (p == 'vehicule' || p == 'itineraire') {
            changeStatusbarColor('#333');
        } else {
            changeStatusbarColor('#F60');
        }

    });

    $$(document).on('pageAfterAnimation', function(e) {

        // Get page data from event data
        var page = e.detail.page;
        var p = page.name.split("-");

        if (p[0] === 'depart' && page.from != "left") {
            $('.page-depart .page-content').animate({
                scrollTop: $(".current").offset().top - 100
            }, 500);
        }

        if (p[0] === 'depart' && $(".pdata").length) {

            $$(page.container).find('.page-content').css('padding-bottom', "150px");

            if ($(".pdata").length > 0) { // S'il y a des perturbations
                f7.addNotification({
                    message: $('.pdata').html(),
                    button: false
                });
            }
        }

        if (p[0] == 'page' ||  p[0] == 'index') {
            $.ajax({
                url: "/ajax/ajaxprochainsdeparts.php?id=" + p[1],
                cache: false,
                success: function(result) {
                    $$(page.container).find('.page-content').html(result);
                    $$('.page-page').removeClass('layout-dark');
                    $$('.page-index').removeClass('layout-dark');
                }
            });
        }

    });

    $$(document).on('click', '.show-m', function(e) {
        $$('.show-h').removeClass('active');
        $$('.show-m').addClass('active');
        $$('.h').hide();
        $$('.m').show();
        $$('.tab-link-highlight').css('transform', 'translate3d(0%, 0px, 0px)');
    });

    $$(document).on('click', '.show-h', function(e) {
        $$('.show-m').removeClass('active');
        $$('.show-h').addClass('active');
        $$('.h').show();
        $$('.m').hide();
        $$('.tab-link-highlight').css('transform', 'translate3d(100%, 0px, 0px)');
    });

    // Back button pressed
    window.addEventListener('popstate', function(event) {
        // Stay on the current page.
        history.pushState(null, null, window.location.pathname);

        mainView.router.back();
    }, false);
}

f7.onPageInit('arrets', function(){
    $$.ajax({
        url: '/arrets/arrets.json',
        dataType: 'json',
        success: function(data){
            var template = '<li>'+
                             '<a href="/ajax/page/{{stopCode}}/{{stopName}}" class="item-link">'+
                                '<div class="item-content">'+
                                   '<div class="item-inner">'+
                                      '<div class="item-title">{{stopName}}</div>'+
                                   '</div>'+
                                '</div>'+
                             '</a>'+
                          '</li>';

            f7.virtualList('.virtual-list', {
                items: data,
                template: template,
                searchAll: function (query, items) {
                    var foundItems = [];
                    for (var i = 0; i < items.length; i++) {
                        if(items[i].stopCode.toLowerCase().indexOf(query.toLowerCase().trim()) >= 0 || items[i].stopName.toLowerCase().indexOf(query.toLowerCase().trim()) >= 0) {
                            foundItems.push(i);
                        }
                    }
                    return foundItems;
                }
            });
        }
    });

    // Localisation
    if("geolocation" in navigator){

        $$('.location-message').hide();
        $$('.enable-geolocation').show();

        $$('.enable-geolocation').on('click', function(){
            // Quand l'utilisateur appuie sur "Afficher les arrêts à proximité"

            // On retire le bouton
            $$('.enable-geolocation').hide();
            // On affiche le message de loading
            $$('.location-message').css('display', 'flex');

            // On récupère sa position
            navigator.geolocation.getCurrentPosition(function(position){

                // On envoie au serveur sa position
                $$.ajax({
                    url: '/arrets/geolocation.json',
                    dataType: 'json',
                    data: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    },
                    success: function(stops){

                        if(stops.length == 0){ // aucun arrêt
                            $$('.location-message .item-title').text('Aucun arrêt proche trouvé');
                        } else {

                            $$('.location-message').hide();

                            for(var i = 0; i < stops.length; i++){
                                var stop = stops[i];

                                var html =  '<li>'+
                                                '<a href="/ajax/page/'+stop.stopCode+'/'+stop.stopName+'" class="item-link item-content">'+
                                                    '<div class="item-media">'+
                                                        '<i class="icon icon-location"></i>'+
                                                    '</div>'+
                                                   '<div class="item-inner">'+
                                                      '<div class="item-title">'+stop.stopName+'</div>'+
                                                   '</div>'+
                                                '</a>'+
                                            '</li>';

                                $$('.arrets-location ul').append(html);
                            }
                        }
                    }
                });
            }, function(){ // Impossible d'obtenir la localisation
                $$('.location-message .item-title').text("Impossible d'obtenir votre position");
            });
        });

    } else {
        $$('.arrets-location').remove();
    }

    // Quand on recherche un arrêt,
    // on cache les arrêts à proximité
    $$('#arrets-search').on('keyup', function(){
        if($$(this).val().trim() !== ''){
            $$('.arrets-location').hide();
        } else {
            $$('.arrets-location').show();
        }
    });

});

f7.onPageInit('itineraire', function () {

    $$('form.ajax-submit').on('submitted', function (e) {
        mainView.router.load({
            content: e.detail.data.replace(/SCREENWIDTH/g, screen.width)
        });
    });

    $$.ajax({
        url: '/itineraire/stops.json',
        method: 'GET',
        dataType: 'json',
        success: function(stops){
            function genererAutocomplete(sens, titre){ // sens = 'depart' ou 'arrivee'
                var autocomplete = f7.autocomplete({
                    openIn: 'page',
                    opener: $$('.itineraire-' + sens),
                    backOnSelect: true,
                    source: source,
                    onChange: onChange,
                    pageTitle: titre,
                    backText: 'Retour',
                    notFoundText: 'Aucun arrêt trouvé',
                    searchbarPlaceholderText: 'Rechercher...',
                    searchbarCancelText: 'Annuler'
                });

                function source (autocomplete, query, render) {
                    var results = [];

                    if (query.length === 0) {
                        render(stops);
                        return;
                    }

                    for (var i = 0; i < stops.length; i++) {
                        if (stops[i].toLowerCase().indexOf(query.toLowerCase()) >= 0) results.push(stops[i]);
                    }

                    render(results);
                }

                function onChange(autocomplete, value){
                    $$('.itineraire-' + sens).find('.item-after').text(value[0]);
                    $$('.itineraire-' + sens).find('input').val(value[0]);
                }
            }

            genererAutocomplete('depart', 'Départ');
            genererAutocomplete('arrivee', 'Arrivée');
        }
    });
});

f7.onPageInit('trajets', function(){
    var swiper = new Swiper('.swiper-container', {
        pagination: '.swiper-pagination'
    });
});
