Архитектура клиентcкого приложения
==================================

Целью данного проекта является определение лучших практик построения клиентского приложения, в основе которого лежит AngularJS.

Основные компоненты
-------------------

### Взаимодействие с сервером ###

За основу взаимодействия с сервером следует брать принципы REST-архитектуры.

Для упрощения можно использовать только JSON-формат. К сожалению, для JSON-формата не разработано стандартных протоколов запросов и ответов, поэтому определим наш протокол здесь.

TODO: переделать на camelCase и посмотреть http://google-styleguide.googlecode.com/svn/trunk/jsoncstyleguide.xml
#### Методы запросов ####

Должны поддерживаться четыре метода HTTP.

GET - получение сущности или коллекции сущностей.
POST - создание новой сущности.
PUT - обновление сущности или выполнение команды.
DELETE - удаление сущности.

#### Формат запросов ####

GET и DELETE не могут содержать тело запроса. Телом запроса для POST и PUT должно являться JSON-представление сущности или команды.

Пример.
 ```text
    POST /campaigns
    {
      "name": "New campaign",
      "start_date": "2013-10-10"
    }
 ```

TODO: описать get-параметры для запросов коллекций

#### Формат ответов ####

Формат ответа на любой зарос должен выглядеть следующим образом.
```text
    {
      "status": %"success", если запрос успешен; "error" иначе%,
      "data": %полезная нагрузка, может отсутствовать в случае ошибки%,
      "message": %сообщение в случае ошибки%,
      "warnings": %массив предупреждений в случае успеха, формат зависит от сущности/команды%,
      "total": %общее число элементов, если в data находится коллекция%
    }
```

Пример запроса конкретной сущности.

```text
    GET /campaigns/12345
    ~
    {
      "status": "success",
      "data": {
        "id": 12345,
        "name": "Some campaign",
        "start_date": "2013-10-10"
      }
    }
```

Пример выполнения команды.

```text
    PUT /campaigns/12345/copy
    {
      "new_name": "Copy of 12345 campaign"
    }
    ~
    {
      "status": "success",
      "data": {
        "id": 12346,
        "name": "Copy of 12345 campaign"
        "start_date": "2013-10-10"
      }
      "warnings": [
        "Campaign has no ads"
      ]
    }
```

Пример удаления сущности.

```text
    DELETE /campaigns/123467
    ~
    {
      "status": "error",
      "message": "Campaign not found"
    }
```

Пример запроса коллекции сущностей.

```text
    GET /campaigns?per_page=2
    ~
    {
      "status": "success",
      "data": [
        {
          "id": 12345,
          "name": "Some campaign",
          "start_date": "2013-10-10"
        },
        {
          "id": 12346,
          "name": "Another campaign",
          "start_date": "2013-09-10"
        }
      ],
      "total": 20
    }
```

#### Форматы полей ####

* Строка - любое значение типа String.
* Целое число - целочисленное значение типа Number.
* Число с фиксированной точностью - значение типа String, содержащее цифровые символы.
* Дата - значение типа String в формате ISO 8601 "YYYY-MM-DD".
* Дата и время  - значение типа String в формате ISO 8601 "YYYY-MM-DDThh:mm:ss".
* Флаг - значение типа Boolean.
* Перечисление - значение типа String из заранее заданного набора значений.
* Массив - значение типа Array, элементами которого являются значения допустимых форматов.
* Объект - значение типа Object, значениями полей которого являются значения допустимых форматов.

Допустимым значением поле является null, но не undefined.

Пример.

```
    {
      "string": "Any string value!11"
      "integer": 12345,
      "decimal": "1234.56",
      "date": "2013-10-10",
      "datetime": "2013-10-10T11:22:33",
      "flag": true,
      "enumitem": "GREEN",
      "array": [1, 2, 3],
      "object": {
         "a": 1,
         "b": "hello"
      },
      "nullable": null
    }
```

#### Использование на клиенте ####

На клиенте для запросов следует использовать сервис $resource модуля ngResource.

Так как наш формат передачи данных немного отличается от принятого, то нам необходимо настроить функции трансформации.

```javascript

    var JSON_START = /^\s*(\[|\{[^\{])/,
        JSON_END = /[\}\]]\s*$/;

    $httpProvider.defaults.transformResponse = function(data, headersGetter) {
        if (JSON_START.test(data) && JSON_END.test(data)) {
            var json = angular.fromJson(data);
            return json.data;
        }
        return data;
    };
```

После этого можно описывать ресурсы.

```javascript
    angular.module('campaigns.resources', ['ngResource'])
        .factory('Campaign', ['$resource',
            function ($resource) {
                 return $resource('api/campaigns/:id', {id: '@id'});
            }
        ]);
```

Использовать этот ресурс можно, например, так:

```javascript
    var campaigns = Campaign.query(function () {
      var campaign = campaigns[0];
      campaign.name = "asdfgh";
      campaign.$save();
    });
```

TODO: по умолчанию $resource не поддерживает PUT. надо подумать, нужно ли его добавлять

TODO: передача токена будет в разделе авторизации


### Роутинг ###

Стандартный роутинг ангуляра (ныне отдельный пакет angular-router) не очень хорош по причинам:
1. Не поддерживает несколько независимых областей рендеринга.
2. Не позволяет делать вложенные области.
3. Не позволяет именовать маршруты.

В связи с этим предполагается использование [angular-ui-router](https://github.com/angular-ui/ui-router).

Есть два основных способа организации описания роутов: хранить все роуты в одном месте или хранить роуты каждого
модуля отдельно в каждом модуле.

У обоих подходов есть свои плюсы и минусы, но на мой взгляд, подход с хранением урлов в одном месте более целостный.

Пример использования.

```javascript
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
```

В примере использованы две области рендеринга: `navbar` и `main`. Они заданы в шаблоне как
`<div ui-view="navbar"></div>` и `<div ui-view="main"></div>`.

У всех областей в примере одинаковое меню в области navbar, поэтому используется абстрактное состояние `mainNavigable`,
который задает параметры этой области. Все остальные состояния отображаются в области `main`.

Наследование состояний сознательно задается явно через параметр `parent`, а не через точку в названии. Это придает
дополнительную гибкость: при изменении структуры состояний - ссылки на них не меняются.

Поэтому ссылки на состояния не должны просписываться явно типа `<a href="/campaigns/list/">list</a>`, а должны
использовать имена. Например: `<a ui-sref="campaigns.list'>list</a>`. Такой подход позволяет безболезненно менять
урлы без изменения кода и шаблонов.

При необходимости перенаправления из кода контроллера должен использоваться вызов `$state.go()`.

Ссылки:

* [Wiki проекта angular-ui-router](https://github.com/angular-ui/ui-router/wiki)
* [Статья про использование ui-router  в больших приложениях](http://lgorithms.blogspot.ru/2013/07/angularui-router-as-infrastructure-of.html)


NB: Мне не очень нравится задание шаблонов в роутинге. На мой взгляд, это должна быть ответственность контроллера.
Но похоже, что это общепринятая практика в angular, которую не стоит менять.


### Шаблонизация ###

В качестве системы шаблонизации выступает сам angular.

Допускаются все практики, описанные в [документации](http://docs.angularjs.org/guide/dev_guide.templates).

TODO: описать хорошие практики по передаче моделей в scope?

Также хорошей практикой является размещение каждого шаблона в отдельном файле.

Подгрузка и склеивание шаблонов будет описана в разделе про сборку.

Вывод чисел, денежных значений, времени и дат будет рассмотрен в разделе про локализацию и интернационализацию.

TODO: описать основные фильтры и директивы?

В целом не надо забывать основных правил хорошей верстки. Использование инлайн-стилей крайне нежелательно.
Верстка и классы должны быть максимально семантичными, а не зависеть от конкретного дизайна или стиля.


### Валидация ###

Валидация должна проходить на двух уровнях: на клиентском и на серверном.

На сервере должно проверяться все то же, что на клиенте, плюс, возможно, дополнительные бизнес-правила.

При таком подходе логично правила хранить на сервере и экспортировать нужные на клиент.

#### Стандартные валидаторы ####

Стандартные валидаторы, которые должны поддерживаться на клиенте и на сервере:

1. Required (NotBlank) - валидатор обязательного присутствия. Параметры:
  * message - сообщения при отсутствии поля
1. Length - валидатор длины строки (текста). Параметры:
  * min - минимально допустимая длина строки
  * max - максимально допустимая длина строки
  * minMessage - сообщение при нарушении минимального ограничения
  * maxMessage - сообщение при нарушении максимального ограничения
  * exactMessage - сообщение при нарушении точного ограничения (если max=min)
1. Range - валидатор диапазона числового значений
  * min - минимально допустимое значение
  * max - макисмально допустимое значение
  * minMessage - сообщение при нарушении минимального ограничения
  * maxMessage - сообщение при нарушении максимального ограничения
  * invalidMessage - сообщение для нечислового значения
1. RegEx - валидатор соответствия строки регулярному выражению
  * pattern - регуярное выражение
  * match - флаг, должна строка соответствовать или не соответствовать выражению
  * message - сообщение при ошибке
1. Email - валидатор соответствия строки валидноиу значению email
  * message - сообщение при ошибке
1. Url - валидатор соответствия строки валидноиу значению url
  * message - сообщение при ошибке

Валидаторы проверки валидного значения даты, времени, флага, enum'a и т.п. на клиенте делать нет смысла, так как за это должны отвечать виджеты.

TODO: поддержка комбинации валидаторов (or, and), поддержка групп

#### Получение правил валидации с сервера ####

Для получения правил валидации необходимо отправлять GET-запрос на сервер.
URL этого шаблона должен выглядеть как URL коллекции ресурса + 'validation'. Напр., `/campaigns/validation`.
Для получения правил валидации определенной группы следует добавлять также ее имя. Напр., `/users/validation/registration`.

В ответ на этот запрос будет возвращен словарь соотвествий поле - массив валидаторов с опциями.

Пример.

```
    GET /campaigns/validation
    ~
    {
      "status": "success",
      "data": {
        "name": [
          {
            "type": "NotBlank",
            "message": "Задайте имя кампании"
          },
          {
            "type": "Length",
            "max": 30,
            "maxMessage": "Имя кампании должно быть короче {{ limit} } символов"
          }
        ],
        "startDate": [
          {
            "type": "NotBlank",
            "message": "Задайте дату начала кампании"
          }
        ]
      }
    }
    
```

TODO: подумать над вложенными объектами

NB: Можно реализовать адаптер, который будет запоминать правила валидации, чтобы не запрашивать их каждый раз отдельно.
По такому же принципу можно включать правила в дистрибутив клиента, но это еще больше снижает гибкость решения.

#### Реализация валидаторов на angular ####

На клиенте для осуществления валидации необходимо использовать компонент [forms](http://docs.angularjs.org/guide/forms)
из angular.

Использование стандартных директив для задания параметров нам не подходит, поэтому нам необходима своя директива,
которая будет применять правила, полученные с сервера, и выдавать стандратные результаты валидации.

Пример такой директивы.

```javascript
    .directive('appValidator', function ($log, appValidators) {
        return {
            require: 'ngModel',
            restrict: 'A',

            link: function(scope, element, attributes, ngModelCtrl) {
                element.bind('blur', function () {
                    var value = ngModelCtrl.$modelValue;

                    var validators = scope.validation[attributes.appValidator],
                        isValid = true,
                        message = '';

                    _.every(validators, function (vd) {
                        var res = appValidators[vd.type](value, vd);
                        isValid = res.isValid;
                        if (!isValid) {
                            message = res.message;
                        }
                        return isValid;
                    });

                    ngModelCtrl.$setValidity('validator', isValid);

                    element.popover('destroy');
                    if (message) {
                        element.popover({
                            content: message,
                            placement: attributes.appValidatorMessagePosition || 'right',
                            trigger: 'manual'
                        }).popover('show');
                    }
                });
            }
        }
```

Такая директива основана на следующих предположениях.

1. Правила валидации контроллером будут помещаться в `scope` как `scope.validation`.
2. Существует фабрика валидаторов `appValidators`, которая повторяет механизм сервера. См. пример ниже.
3. Сообщения валидации будут появляться в виде всплывающих баблов (`popover`) при потере полем фокуса.

Пример фабрики валидаторов.

```javascript
    .factory('appValidators', function () {
        var formatMessage = function (message, params) {
                params = params || {};
                _.each(params, function (v, k) {
                    message = message.replace('{{ ' + k + ' }}', v);
                });
                return message;
            },
            invalidRes = function (message, params) {
                return {isValid: false, message: formatMessage(message, params)};
            },
            validRes = {isValid: true};

        return {
            NotBlank: function (value, params) {
                if (!(value + "").length) {
                    return invalidRes(params.message);
                }
                return validRes;
            },
            Length: function (value, params) {
                var len = value.length;

                if (params.min === params.max && len != params.min) {
                    return invalidRes(params.exactMessage, {limit: params.min, value: value});
                } else if (params.min && len < params.min) {
                    return invalidRes(params.minMessage, {limit: params.min, value: value});
                } else if (params.max && len > params.max) {
                    return invalidRes(params.maxMessage, {limit: params.max, value: value});
                }
                return validRes;
            }
        }
    })
```

Использование директивы `app-validator` в коде.

```
<input type="text" name="name" ng-model='campaign.name' app-validator />
```

Или более кастомизированный вариант:
```
<input type="text" name="name" ng-model='campaign.name' app-validator='name' app-validator-message-position='right' />
```

Атрибут `app-validtor` задает имя правила валидации. По умолчанию, имя правила равно имени поля.
Атрибут `app-validator-message-position` задает положении бабла (`top` | `bottom` | `left` | `right`). По умолчанию,
справа - `right`.

Отображение ошибок валидации будет происходить за счет специального стиля `ng-invalid`, которые имеют невалидные
контролы, а также с помощью вывода текста ошибок рядом с невалидными значениями.

#### Обработка серверных ошибок валидации ####

При ошибке валидации сервер возвращает ответ с кодом 400.

В поле `errors` при этом должен быть словарь ошибок. Ключами в этом словаре должны быть имена невалидных полей, а
значениями списки текстов ошибок. Если поле валидно, оно будет отсутствовать в словаре.

Пример.

```
{
    "code":400,
    "message": "Ошибка валидации",
    "errors": {
        "name": [
            "Название слишком короткое. Оно должно быть длиннее хотя бы 10 символов.",
            "Название должно начинаться с заглавной буквы."
        ]
        "startDate": [
            "Это поле обязательно."
        ]
    }
}
```

Если поле является составным объектом, то вместо списка ошибко валидации будет такой же словарь, как на верхнем уровне.

Пример.

```
{
    "code":400,
    "message": "Ошибка валидации",
    "errors": {
        "address": {
            "street": [
                "Это поле обязательно."
            ]
        }
    }
}
```

TODO: описать примерный вид обработчика


#### Ссылки ####

* [Валидаторы Symfony](http://symfony.com/doc/current/reference/constraints.html)
* [Стандарт "Bean Validation"](http://download.oracle.com/otn-pub/jcp/bean_validation-1.0-fr-oth-JSpec/bean_validation-1_0-final-spec.pdf?AuthParam=1383573004_27e03ca5ca64652e4accca5669891379)
* [Bootstrap popover](http://getbootstrap.com/2.3.2/javascript.html#popovers)

### Авторизация и персонификация ###

TODO: описать процесс аутентификации

TODO: описать передачу токена для запросов

TODO: описать модель пользователя и способы к ней обращения


### Логирование ###

TODO: описать уровни логирования, пример использования и пример конфигурации dev/prod.


### Unit-тестирование ###

TODO: описать используемые фреймворки, примеры тестов всех "классов", способ запуска

TODO: e2e?


### Основные виджеты ###

TODO: описать виджет для всех типов полей (см. первый раздел) + пример кастомного


### Сборка ###

TODO: выбрать используемые плагины grunt, описать основные команды и как что куда собирается


### Локализация и интернационализация ###

TODO: описать, что мы берем из ангуляра, а для чего используем gettext, moment, numeric, etc...


### Автоинспекция кода ###

TODO: описать необходимые правила jshint и способы его запуска


### Замечания ###

#### Установка ####

Для корректной работы в Ubuntu необходимо установить последний nodejs из ppa.

```
sudo add-apt-repository ppa:chris-lea/node.js
```

Кроме nodejs также глобально необходимо установить bower, grunt, jshint.

```
sudo aptitde install nodejs
sudo npm install -g bower grunt-cli jshint
```

После этого поставить зависимости.

```
npm install
bower install
```

И, наконец, запустить приложение.

```
grunt server
```

#### Предпосылки к написанию своего resource ####

* Отсутствие нативного выбора между POST/PUT.
* Отсутствие хорошего механизма замены сериализаторов/десериализаторов для формирования тела запроса и разбора ответа.
* Возврат методами пустых результирующих объектов вместо promises. 
* Отсутствие прослойки для обеспечения валидации.