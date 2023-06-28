/**
 * Pages module.
 *
 * @module pages
 */

import $ from 'jquery';
import config from 'enketo/config';
import events from './event';
import { getSiblingElement, getAncestors } from './dom-utils';
import 'jquery-touchswipe';

/**
 * @typedef {import('./form').Form} Form
 */

export default {
    /**
     * @type {Form}
     */
    // @ts-expect-error - this will be populated during form init, but assigning
    // its type here improves intellisense.
    form: null,

    /**
     * @type {boolean}
     * @default
     */
    active: false,
    /**
     * @type {Array|jQuery}
     * @default
     */
    current: null,
    /**
     * @type {jQuery}
     */
    activePages: [],
    /**
     * @type {Function}
     */
    init() {
        if (!this.form) {
            throw new Error(
                'Repeats module not correctly instantiated with form property.'
            );
        }
        if (this.form.features.pagination) {
            const allPages = [
                ...this.form.view.html.querySelectorAll(
                    '.question, .or-appearance-field-list'
                ),
            ]
                .concat([
                    ...this.form.view.html.querySelectorAll(
                        '.or-repeat.or-appearance-field-list + .or-repeat-info'
                    ),
                ])
                .filter(
                    (el) =>
                        // something tells me there is a more efficient way to doing this
                        // e.g. by selecting the descendants of the .or-appearance-field-list and removing those
                        !el.parentElement.closest(
                            '.or-appearance-field-list'
                        ) &&
                        !(
                            el.matches('.question') &&
                            el.querySelector('[data-for]')
                        )
                )
                .map((el) => {
                    el.setAttribute('role', 'page');

                    return el;
                });

            if (
                allPages.length > 0 ||
                allPages[0].classList.contains('or-repeat')
            ) {
                const formWrapper = this.form.view.html.parentNode;
                this.$formFooter = $(formWrapper.querySelector('.form-footer'));
                this.$btnFirst = this.$formFooter.find('.first-page');
                this.$btnPrev = this.$formFooter.find('.previous-page');
                this.$btnNext = this.$formFooter.find('.next-page');
                this.$btnNext.attr('tabindex', 2);
                this.$btnLast = this.$formFooter.find('.last-page');
                this.$toc = $(formWrapper.querySelector('.pages-toc__list'));
                this._updateAllActive(allPages);
                this._updateToc();
                this._toggleButtons(0);
                this._setButtonHandlers();
                this._setRepeatHandlers();
                this._setBranchHandlers();
                this._setSwipeHandlers();
                this._setTocHandlers();
                this._setLangChangeHandlers();
                this.active = true;
                this._flipToFirst();
            }
            /* else {
                form.view.$.removeClass( 'pages' );
            } */
        }
    },
    /**
     * flips to the page provided as jQueried parameter or the page containing
     * the jQueried element provided as parameter
     * alternatively, (e.g. if a top level repeat without field-list appearance is provided as parameter)
     * it flips to the page contained with the jQueried parameter;
     *
     * @param {jQuery} $e - Element on page to flip to
     */
    flipToPageContaining($e) {
        const e = $e[0];
        const closest = e.closest('[role="page"]');

        if (closest) {
            this._flipTo(closest);
        } else {
            // If $e is a comment question, and it is not inside a group, there will be no closest.
            const referer = e.querySelector('[data-for]');
            const ancestor = e.closest('.or-repeat, form.or');
            if (referer && ancestor) {
                const linkedQuestion = ancestor.querySelector(
                    `[name="${referer.dataset.for}"]`
                );
                if (linkedQuestion) {
                    this._flipTo(linkedQuestion.closest('[role="page"]'));
                }
            }
        }
        this.$toc.parent().find('.pages-toc__overlay').click();
    },
    /**
     * sets button handlers
     */
    _setButtonHandlers() {
        const that = this;
        // Make sure eventhandlers are not duplicated after resetting form.
        this.$btnFirst.off('.pagemode').on('click.pagemode', () => {
            if (!that.form.pageNavigationBlocked) {
                that._flipToFirst();
            }

            return false;
        });
        this.$btnPrev.off('.pagemode').on('click.pagemode', () => {
            if (!that.form.pageNavigationBlocked) {
                that._prev();
            }

            return false;
        });
        this.$btnNext.off('.pagemode').on('click.pagemode', () => {
            if (!that.form.pageNavigationBlocked) {
                that._next();
            }

            return false;
        });
        this.$btnLast.off('.pagemode').on('click.pagemode', () => {
            if (!that.form.pageNavigationBlocked) {
                that._flipToLast();
            }

            return false;
        });
    },
    /**
     * sets swipe handlers
     */
    _setSwipeHandlers() {
        if (config.swipePage === false) {
            return;
        }
        const that = this;
        const $main = this.form.view.$.closest('.main');

        $main.swipe('destroy');
        $main.swipe({
            allowPageScroll: 'vertical',
            threshold: 250,
            preventDefaultEvents: false,
            swipeLeft() {
                that.$btnNext.click();
            },
            swipeRight() {
                that.$btnPrev.click();
            },
            swipeStatus(evt, phase) {
                if (phase === 'start') {
                    /*
                     * Triggering blur will fire a change event on the currently focused form control
                     * This will trigger validation and is required to block page navigation on swipe
                     * with form.pageNavigationBlocked
                     * The only potential problem with this approach is that the threshold (250ms)
                     * may theoretically not be sufficient to ensure validation is completed to
                     * set form.pageNavigationBlocked to true. The edge case will be very slow devices
                     * and/or amazingly complex constraint expressions.
                     */
                    const focused = that._getCurrent()
                        ? that._getCurrent().querySelector(':focus')
                        : null;
                    if (focused) {
                        focused.blur();
                    }
                }
            },
        });
    },
    /**
     * sets toc handlers
     */
    _setTocHandlers() {
        const that = this;
        this.$toc
            .on('click', 'a', function () {
                if (!that.form.pageNavigationBlocked) {
                    if (
                        this.parentElement &&
                        this.parentElement.getAttribute('tocId')
                    ) {
                        const tocId = parseInt(
                            this.parentElement.getAttribute('tocId'),
                            10
                        );
                        const destItem = that.form.toc.tocItems.find(
                            (item) => item.tocId === tocId
                        );
                        if (destItem && destItem.element) {
                            const destEl = destItem.element;
                            that.form.goToTarget(destEl);
                        }
                    }
                }

                return false;
            })
            .parent()
            .find('.pages-toc__overlay')
            .on('click', () => {
                that.$toc.parent().find('#toc-toggle').prop('checked', false);
            });
    },
    /**
     * sets repeat handlers
     */
    _setRepeatHandlers() {
        // TODO: can be optimized by smartly updating the active pages
        this.form.view.html.addEventListener(
            events.AddRepeat().type,
            (event) => {
                this._updateAllActive();
                // Don't flip if the user didn't create the repeat with the + button.
                // or if is the default first instance created during loading.
                // except if the new repeat is actually the first page in the form, or contains the first page
                if (
                    event.detail.trigger === 'user' ||
                    this.activePages[0] === event.target ||
                    getAncestors(this.activePages[0], '.or-repeat').includes(
                        event.target
                    )
                ) {
                    this.flipToPageContaining($(event.target));
                } else {
                    this._toggleButtons();
                }
            }
        );
        this.form.view.html.addEventListener(
            events.RemoveRepeat().type,
            (event) => {
                // if the current page is removed
                // note that that.current will have length 1 even if it was removed from DOM!
                if (this.current && !this.current.closest('html')) {
                    this._updateAllActive();
                    let $target = $(event.target).prev();
                    if ($target.length === 0) {
                        $target = $(event.target);
                    }
                    // is it best to go to previous page always?
                    this.flipToPageContaining($target);
                }
            }
        );
    },
    /**
     * sets branch handlers
     */
    _setBranchHandlers() {
        const that = this;
        // TODO: can be optimized by smartly updating the active pages
        this.form.view.$
            // .off( 'changebranch.pagemode' )
            .on('changebranch.pagemode', () => {
                that._updateAllActive();
                // If the current page has become inactive (e.g. a form whose first page during load becomes non-relevant)
                if (!that.activePages.includes(that.current)) {
                    that._next();
                }
                that._toggleButtons();
            });
    },
    /**
     * sets language change handlers
     */
    _setLangChangeHandlers() {
        this.form.view.html.addEventListener(
            events.ChangeLanguage().type,
            () => {
                this._updateToc();
            }
        );
    },
    /**
     * @return {Element} current page
     */
    _getCurrent() {
        return this.current;
    },
    /**
     * @param {Array<Node>} all - all elements that represent a page
     */
    _updateAllActive(all) {
        all = all || [...this.form.view.html.querySelectorAll('[role="page"]')];
        this.activePages = all.filter(
            (el) =>
                !el.closest('.disabled') &&
                (el.matches('.question') ||
                    el.querySelector('.question:not(.disabled)') ||
                    // or-repeat-info is only considered a page by itself if it has no sibling repeats
                    // When there are siblings repeats, we use CSS trickery to show the + button underneath the last
                    // repeat.
                    (el.matches('.or-repeat-info') &&
                        !getSiblingElement(el, '.or-repeat')))
        );
        this._updateToc();
    },
    /**
     * @param {number} currentIndex - current index
     * @return {jQuery} Previous page
     */
    _getPrev(currentIndex) {
        return this.activePages[currentIndex - 1];
    },
    /**
     * @param {number} currentIndex - current index
     * @return {jQuery} Next page
     */
    _getNext(currentIndex) {
        return this.activePages[currentIndex + 1];
    },
    /**
     * @return {number} Current page index
     */
    _getCurrentIndex() {
        return this.activePages.findIndex((el) => el === this.current);
    },
    /**
     * Changes the `pages.next()` function to return a `Promise`, wrapping one of the following values:
     *
     * @return {Promise} wrapping {boolean} or {number}.  If a {number}, this is the index into
     *         `activePages` of the new current page; if a {boolean}, {false} means that validation
     *         failed, and {true} that validation passed, but the page did not change.
     */
    _next() {
        const that = this;
        let currentIndex;
        let validate;

        currentIndex = this._getCurrentIndex();
        validate =
            config.validatePage === false || !this.current
                ? Promise.resolve(true)
                : this.form.validateContent($(this.current));

        return validate.then((valid) => {
            let next;
            let newIndex;

            if (!valid) {
                return false;
            }

            next = that._getNext(currentIndex);

            if (next) {
                newIndex = currentIndex + 1;
                that._flipTo(next, newIndex);
                // return newIndex;
            }

            return true;
        });
    },
    /**
     * Switches to previous page
     */
    _prev() {
        const currentIndex = this._getCurrentIndex();
        const prev = this._getPrev(currentIndex);

        if (prev) {
            this._flipTo(prev, currentIndex - 1);
        }
    },
    /**
     * @param {Element} pageEl - page element
     */
    _setToCurrent(pageEl) {
        pageEl.classList.add('current', 'hidden');
        // Was just added, for animation?
        pageEl.classList.remove('hidden');
        getAncestors(
            pageEl,
            '.or-group, .or-group-data, .or-repeat',
            '.or'
        ).forEach((el) => el.classList.add('contains-current'));
        this.current = pageEl;
        this.form.goToTarget(pageEl, { isPageFlip: true });
    },
    /**
     * Switches to a page
     *
     * @param {Element} pageEl - page element
     * @param {number} newIndex - new index
     */
    _flipTo(pageEl, newIndex) {
        // if there is a current page (note: if current page was removed it is not null, hence the .closest('html') check)
        if (this.current && this.current.closest('html')) {
            // if current page is not same as pageEl
            if (this.current !== pageEl) {
                this.current.classList.remove('current', 'fade-out');
                getAncestors(
                    this.current,
                    '.or-group, .or-group-data, .or-repeat',
                    '.or'
                ).forEach((el) => el.classList.remove('contains-current'));
                this._pauseMultimedia(this.current);
                this._setToCurrent(pageEl);
                this._focusOnFirstQuestion(pageEl);
                this._toggleButtons(newIndex);
                pageEl.dispatchEvent(events.PageFlip());
                this.form.goToTarget(pageEl, { isPageFlip: true });
            }
        } else if (pageEl) {
            this._setToCurrent(pageEl);
            this._focusOnFirstQuestion(pageEl);
            this._toggleButtons(newIndex);
            pageEl.dispatchEvent(events.PageFlip());
            this.form.goToTarget(pageEl, { isPageFlip: true });
            pageEl.setAttribute('tabindex', 1);
        }
    },
    /**
     * Switches to first page
     */
    _flipToFirst() {
        this._flipTo(this.activePages[0]);
    },
    /**
     * Switches to last page
     */
    _flipToLast() {
        this._flipTo(this.activePages[this.activePages.length - 1]);
    },
    /**
     * Focuses on first question and scrolls it into view
     *
     * @param {Element} pageEl - page element
     */
    _focusOnFirstQuestion(pageEl) {
        // triggering fake focus in case element cannot be focused (if hidden by widget)
        $(pageEl)
            .find('.question:not(.disabled)')
            .addBack('.question:not(.disabled)')
            .filter(function () {
                return $(this).parentsUntil('.or', '.disabled').length === 0;
            })
            .eq(0)
            .find('input, select, textarea')
            .eq(0)
            .trigger('fakefocus');

        // focus on element
        pageEl.focus();

        pageEl.scrollIntoView();
    },
    /**
     * Updates status of navigation buttons
     *
     * @param {number} [index] - index of current page
     */
    _toggleButtons(index = this._getCurrentIndex()) {
        const next = this._getNext(index);
        const prev = this._getPrev(index);
        this.$btnNext.add(this.$btnLast).toggleClass('disabled', !next);
        this.$btnPrev.add(this.$btnFirst).toggleClass('disabled', !prev);
        this.$formFooter.toggleClass('end', !next);
    },
    /**
     * Pauses video and audio from playing when switching to a page.
     *
     * @param {Element} pageEl - page element
     */
    _pauseMultimedia(pageEl) {
        $(pageEl)
            .find('audio, video')
            .each((idx, element) => element.pause());
    },
    /**
     * Updates Table of Contents
     */
    _updateToc() {
        if (this.$toc.length) {
            // regenerate complete ToC from first enabled question/group label of each page
            this.$toc.empty()[0].append(this.form.toc.getHtmlFragment());
            this.$toc.closest('.pages-toc').removeClass('hide');
        }
    },
};
