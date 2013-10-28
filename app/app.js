'use strict';

angular.module('app', [
        'ngCookies',
        'ngSanitize',
        'ngMockE2E',
        'ui.router',
        'common.controllers',
        'campaigns.controllers'
    ])
    .config(function ($stateProvider, $urlRouterProvider, $httpProvider) {
        var JSON_START = /^\s*(\[|\{[^\{])/,
            JSON_END = /[\}\]]\s*$/;

        $httpProvider.defaults.transformResponse = function(data, headersGetter) {
            if (JSON_START.test(data) && JSON_END.test(data)) {
                var json = angular.fromJson(data);
                return json.data;
            }
            return data;
        };

        /*$httpProvider.defaults.transformRequest = function(data, headersGetter) {
            return angular.toJson(data);
        };*/

        $stateProvider
            .state('mainNavigable', {
                abstract: true,
                views: {
                    'navbar': {
                        templateUrl: '/scripts/modules/common/templates/navbar.tpl.html',
                        controller: 'NavBarController'
                    },
                    'main': {
                        template: '<ui-view/>'
                    }
                }
            })
            .state('home', {
                parent: 'mainNavigable',
                url: '/',
                templateUrl: '/scripts/modules/common/templates/home.tpl.html',
                controller: 'HomeController'
            })
            .state('campaignsList', {
                parent: 'mainNavigable',
                url: '/campaigns',
                templateUrl: '/scripts/modules/campaigns/templates/list.tpl.html',
                controller: 'CampaignListController'
            })
            .state('campaignsCreate', {
                parent: 'mainNavigable',
                url: '/campaigns/create',
                templateUrl: '/scripts/modules/campaigns/templates/create.tpl.html',
                controller: 'CampaignCreateController'
            });

        $urlRouterProvider.otherwise("/");
    })

    .run(function($httpBackend) {

        var mockCampaigns = {
                123: {
                    "id": 123,
                    "name": "Elephant store",
                    "start_date": "2013-10-10"
                },
                456: {
                    "id": 456,
                    "name": "Magic mushrooms",
                    "start_date": "2013-09-10"
                }
            },
            campaignReturn = function(method, url, data) {
                var matches = url.match(/[0-9]*/),
                    id = matches[0];
                return angular.toJson({
                    "status": "success",
                    "data": mockCampaigns[id]
                });
            };

        $httpBackend.whenGET('/api/campaigns').respond(
            angular.toJson({
                "status": "success",
                "data": _.values(mockCampaigns),
                "total": 20
            })
        );
        $httpBackend.whenGET(/\/api\/campaigns\/[0-9]*/).respond(campaignReturn);
        $httpBackend.whenPOST(/\/api\/campaigns\/[0-9]*/).respond(campaignReturn);

        $httpBackend.whenGET(/.*\.html/).passThrough();
    });