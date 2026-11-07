# Внешние компоненты

Three.js используется для объёмной обсерватории, спутников глав, представления переменных и игрового поля. Исходники сцены: src/components/Observatory.tsx.

Python выполняется с помощью Pyodide 314.0.7 / WebAssembly. Сборка загружает фиксированные файлы из официального jsDelivr-дистрибутива и проверяет SHA-256 по scripts/python-runtime.json. Большие бинарные файлы не хранятся в Git. В готовом сайте они лежат в /python/314.0.7/ и загружаются с того же сервера. Версионированный путь позволяет безопасно кэшировать их между запусками.

Исходники Pyodide: https://github.com/pyodide/pyodide/tree/314.0.7
Лицензия дистрибутива сохранена в [Pyodide-LICENSE.txt](licenses/Pyodide-LICENSE.txt) и копируется в готовый сайт.

Документация:
- https://pyodide.org/en/stable/usage/webworker.html
- https://docs.python.org/3/tutorial/
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

Lofi/ambient создаётся программно через Web Audio: аккорды, бас, синтезированные ударные. Внешних треков, потоковых сервисов и музыкальных аккаунтов нет. Шрифты могут загружаться из Google Fonts; предусмотрены системные запасные шрифты.
