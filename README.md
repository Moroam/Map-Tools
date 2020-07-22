# Map-Tools
Tools for working with Yandex maps

Инструменты для работы с Яндекс картами

Основано на документации api Yandex map и вдохновлено примером http://dimik.github.io/ymaps/examples/context-menu/

Возможности:
    1. Контекстное меню:
        1.1. Что здесь? — Определение адреса и координат точки на карте
        1.2. Добавление геообъектов на карту (метки, ломаной, области/полигона)
        1.3. Изменение геообъектов на карте (метки, ломаной, области) — перетаскивание узлов / метки
        1.4. Фиксация геообъектов на карте (прекращение режима изменения)
        1.5. Удаление геообъектов с карты
        1.6. Изменение параметров геообъектов:
               Метка: 
            a) текст рядом с меткой (допускает html разметку)
            b) подпись — желательно не более двух символов, подпись располагается внутри метки
            c) цвет
            d) балун — всплывающее облако, открывающиеся при щелчке по метке
            e) хинт — всплывающая подсказка над меткой, показывается при наведении на метку
               Ломаная:
            a) максимальное количество вершин
            b) параметры линии: цвет, прозрачность, ширина
            c) балун
            d) хинт
               Полигон:
            a) максимальное количество вершин
            b) параметры линии границы: цвет, прозрачность, ширина
            c) параметры заливки: цвет, прозрачность
            d) балун
            e) хинт
        1.7. Построение маршрута проезда с точки А до точки Б
        1.8. Удаление маршрута
    2. Выпадающий список — Действия:
        2.1. Экспорт данных карты в json файл:
            a) координат центра карты
            b) масштаба карты
            c) данных гееобъектов
        2.2. Импорт данных карты из файла json (полученного в экспорте)
            a) координат центра карты
            b) масштаба карты
            c) данных гееобъектов
        2.3. Включение/выключение режима перетаскивания — действует на геообъекты для которых выбирается изменить, через контекстное меню после изменения режима перетаскивания
        2.4. Масштабирование — изменяется размер контейнера с картой таким образом, чтобы в контейнере располагался исходный участок карты с масштабом 17 (параметр defaultZoom, отображены номера домов) — используется для получения снимка карты. В качестве инструмента для получения снимка используется дополнения к браузеру, например, Nimbus Capture
        2.5. Сброс Масштаба — возвращение размера контейнера с картой и масштаба, которые были до использования действия Масштабирование
