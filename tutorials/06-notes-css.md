### Notes for CSS Developers

The core can be fairly easily extended with alternative themes.
See the *plain*, the *grid*, and the *formhub* themes already included in [/src/sass](./src/sass).
We would be happy to discuss whether your contribution should be a part of the core, the default theme or be turned into a new theme.

For custom themes that go beyond just changing colors and fonts, keep in mind all the different contexts for a theme:

1. non-touchscreen vs touchscreen (add ?touch=true during development)
2. default one-page-mode and multiple-pages-mode
3. right-to-left form language vs left-to-right form language (!) - also the UI-language may have a different directionality
4. screen view vs. print view
5. questions inside a (nested) repeat group have a different background
6. large screen size --> smaller screen size ---> smallest screen size
7. question in valid vs. invalid state
