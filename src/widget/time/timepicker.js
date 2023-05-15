import $ from 'jquery';
import event from '../../js/event';
import { time } from '../../js/format';

/*!
 * Timepicker
 *
 * Forked from https://github.com/jdewit/bootstrap-timepicker:
 *
 * Copyright 2013 Joris de Wit and timepicker contributors
 *
 * Contributors https://github.com/jdewit/bootstrap-timepicker/graphs/contributors
 * Contributors https://github.com/enketo/timepicker-basic/graphs/contributors
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
(($, window, document) => {
    // TIMEPICKER PUBLIC CLASS DEFINITION
    const Timepicker = function (element, options) {
        this.languages = navigator.languages;
        this.widget = '';
        this.$element = $(element);
        this.defaultTime = options.defaultTime;
        this.disableFocus = options.disableFocus;
        this.disableMousewheel = options.disableMousewheel;
        this.isOpen = options.isOpen;
        this.minuteStep = options.minuteStep;
        this.orientation = options.orientation;
        this.secondStep = options.secondStep;
        this.snapToStep = options.snapToStep;
        this.showInputs = options.showInputs;
        this.showSeconds = options.showSeconds;
        this.template = options.template;
        this.appendWidgetTo = options.appendWidgetTo;
        this.showWidgetOnAddonClick = options.showWidgetOnAddonClick;
        this.icons = options.icons;
        this.maxHours = options.maxHours;
        this.explicitMode = options.explicitMode; // If true 123 = 1:23, 12345 = 1:23:45, else invalid.

        this.handleDocumentClick = (e) => {
            const self = e.data.scope;
            // This condition was inspired by datepicker.
            // The element the timepicker is invoked on is the input but it has a sibling for addon/button.
            if (
                !(
                    self.$element.parent().find(e.target).length ||
                    self.$widget.is(e.target) ||
                    self.$widget.find(e.target).length
                )
            ) {
                self.hideWidget();
            }
        };

        this._init();
    };

    Timepicker.prototype = {
        get showMeridian() {
            return time.hour12;
        },

        get meridianNotation() {
            return {
                am: time.amNotation,
                pm: time.pmNotation,
            };
        },

        constructor: Timepicker,
        _init() {
            const self = this;

            if (
                this.showWidgetOnAddonClick &&
                this.$element.parent().hasClass('input-group') &&
                this.$element.parent().hasClass('timepicker')
            ) {
                this.$element
                    .parent('.input-group.timepicker')
                    .find('.input-group-addon')
                    .on({
                        'click.timepicker': $.proxy(this.showWidget, this),
                    });
                this.$element.on({
                    'focus.timepicker': $.proxy(this.highlightUnit, this),
                    'click.timepicker': $.proxy(this.highlightUnit, this),
                    'keydown.timepicker': $.proxy(this.elementKeydown, this),
                    'blur.timepicker': $.proxy(this.blurElement, this),
                    'mousewheel.timepicker DOMMouseScroll.timepicker': $.proxy(
                        this.mousewheel,
                        this
                    ),
                });
            } else if (this.template) {
                this.$element.on({
                    'focus.timepicker': $.proxy(this.showWidget, this),
                    'click.timepicker': $.proxy(this.showWidget, this),
                    'blur.timepicker': $.proxy(this.blurElement, this),
                    'mousewheel.timepicker DOMMouseScroll.timepicker': $.proxy(
                        this.mousewheel,
                        this
                    ),
                });
            } else {
                this.$element.on({
                    'focus.timepicker': $.proxy(this.highlightUnit, this),
                    'click.timepicker': $.proxy(this.highlightUnit, this),
                    'keydown.timepicker': $.proxy(this.elementKeydown, this),
                    'blur.timepicker': $.proxy(this.blurElement, this),
                    'mousewheel.timepicker DOMMouseScroll.timepicker': $.proxy(
                        this.mousewheel,
                        this
                    ),
                });
            }

            if (this.template !== false) {
                this.$widget = $(this.getTemplate()).on(
                    'click',
                    $.proxy(this.widgetClick, this)
                );

                this.meridianColumns =
                    this.$widget[0].querySelectorAll('.meridian-column');
            } else {
                this.$widget = false;
            }

            if (this.showInputs && this.$widget !== false) {
                this.$widget.find('input').each(function () {
                    $(this).on({
                        'click.timepicker': function () {
                            $(this).select();
                        },
                        'keydown.timepicker': $.proxy(self.widgetKeydown, self),
                        'keyup.timepicker': $.proxy(self.widgetKeyup, self),
                    });
                });
            }

            this.setDefaultTime(this.defaultTime);
        },

        blurElement() {
            this.highlightedUnit = null;
            this.updateFromElementVal();
        },

        clear() {
            this.hour = '';
            this.minute = '';
            this.second = '';
            this.meridian = '';

            this.$element.val('');
        },

        decrementHour() {
            // If value is empty, make sure that first shown value is current hour.
            if (this.hour === '') {
                this.hour = this.getCurrentHour();
                this.incrementHour();
            }

            if (this.showMeridian) {
                if (this.hour === 1) {
                    this.hour = 12;
                } else if (this.hour === 12) {
                    this.hour--;

                    return this.toggleMeridian();
                } else if (this.hour === 0) {
                    this.hour = 11;

                    return this.toggleMeridian();
                } else {
                    this.hour--;
                }
            } else if (this.hour <= 0) {
                this.hour = this.maxHours - 1;
            } else {
                this.hour--;
            }
        },

        decrementMinute(step) {
            let newVal;

            // If value is empty, make sure that first shown value is current minutes.
            if (this.minute === '') {
                this.minute = this.getCurrentMinute();
                this.incrementMinute();
            }

            if (step) {
                newVal = this.minute - step;
            } else {
                newVal = this.minute - this.minuteStep;
            }

            if (newVal < 0) {
                this.decrementHour();
                this.minute = newVal + 60;
            } else {
                this.minute = newVal;
            }
        },

        decrementSecond() {
            const newVal = this.second - this.secondStep;

            if (newVal < 0) {
                this.decrementMinute(true);
                this.second = newVal + 60;
            } else {
                this.second = newVal;
            }
        },

        elementKeydown(e) {
            switch (e.which) {
                case 9: // tab
                    if (e.shiftKey) {
                        if (this.highlightedUnit === 'hour') {
                            this.hideWidget();
                            break;
                        }
                        this.highlightPrevUnit();
                    } else if (
                        (this.showMeridian &&
                            this.highlightedUnit === 'meridian') ||
                        (this.showSeconds &&
                            this.highlightedUnit === 'second') ||
                        (!this.showMeridian &&
                            !this.showSeconds &&
                            this.highlightedUnit === 'minute')
                    ) {
                        this.hideWidget();
                        break;
                    } else {
                        this.highlightNextUnit();
                    }
                    e.preventDefault();
                    this.updateFromElementVal();
                    break;
                case 27: // escape
                    this.updateFromElementVal();
                    break;
                case 37: // left arrow
                    e.preventDefault();
                    this.highlightPrevUnit();
                    this.updateFromElementVal();
                    break;
                case 38: // up arrow
                    e.preventDefault();
                    switch (this.highlightedUnit) {
                        case 'hour':
                            this.incrementHour();
                            this.highlightHour();
                            break;
                        case 'minute':
                            this.incrementMinute();
                            this.highlightMinute();
                            break;
                        case 'second':
                            this.incrementSecond();
                            this.highlightSecond();
                            break;
                        case 'meridian':
                            this.toggleMeridian();
                            this.highlightMeridian();
                            break;
                    }
                    this.update();
                    break;
                case 39: // right arrow
                    e.preventDefault();
                    this.highlightNextUnit();
                    this.updateFromElementVal();
                    break;
                case 40: // down arrow
                    e.preventDefault();
                    switch (this.highlightedUnit) {
                        case 'hour':
                            this.decrementHour();
                            this.highlightHour();
                            break;
                        case 'minute':
                            this.decrementMinute();
                            this.highlightMinute();
                            break;
                        case 'second':
                            this.decrementSecond();
                            this.highlightSecond();
                            break;
                        case 'meridian':
                            this.toggleMeridian();
                            this.highlightMeridian();
                            break;
                    }

                    this.update();
                    break;
            }
        },

        getCursorPosition() {
            const input = this.$element.get(0);

            if ('selectionStart' in input) {
                // Standard-compliant browsers

                return input.selectionStart;
            }
            if (document.selection) {
                // IE fix
                input.focus();
                const sel = document.selection.createRange();
                const selLen = document.selection.createRange().text.length;

                sel.moveStart('character', -input.value.length);

                return sel.text.length - selLen;
            }
        },

        getMeridianLength() {
            const el = document.createElement('span');
            el.textContent = this.meridianNotation.am;
            el.style.position = 'absolute';
            document.querySelector('body').appendChild(el);
            const amLength = el.scrollWidth;
            el.textContent = this.meridianNotation.pm;
            const pmLength = el.scrollWidth;
            el.remove();

            return amLength > pmLength ? amLength : pmLength;
        },

        getTemplate() {
            let template;
            let hourTemplate;
            let minuteTemplate;
            let secondTemplate;
            let meridianTemplate;
            let templateContent;

            if (this.showInputs) {
                const width =
                    this.getMeridianLength() > 26
                        ? `style="width: ${this.getMeridianLength() + 24}px"`
                        : '';
                hourTemplate = `<input type="text" class="timepicker-hour" ${width}/>`;
                minuteTemplate = `<input type="text" class="timepicker-minute" ${width}/>`;
                secondTemplate = `<input type="text" class="timepicker-second" ${width}/>`;
                meridianTemplate = `<input type="text" class="timepicker-meridian"${width}/>`;
            } else {
                hourTemplate = '<span class="timepicker-hour"></span>';
                minuteTemplate = '<span class="timepicker-minute"></span>';
                secondTemplate = '<span class="timepicker-second"></span>';
                meridianTemplate = '<span class="timepicker-meridian"></span>';
            }

            templateContent = `<table><tr><td><a href="#" data-action="incrementHour"><span class="${
                this.icons.up
            }"></span></a></td><td class="separator">&nbsp;</td><td><a href="#" data-action="incrementMinute"><span class="${
                this.icons.up
            }"></span></a></td>${
                this.showSeconds
                    ? `<td class="separator">&nbsp;</td><td><a href="#" data-action="incrementSecond"><span class="${this.icons.up}"></span></a></td>`
                    : ''
            }<td class="separator meridian-column">&nbsp;</td><td class="meridian-column"><a href="#" data-action="toggleMeridian"><span class="${
                this.icons.up
            }"></span></a></td></tr><tr><td>${hourTemplate}</td> <td class="separator">:</td><td>${minuteTemplate}</td> ${
                this.showSeconds
                    ? `<td class="separator">:</td><td>${secondTemplate}</td>`
                    : ''
            }<td class="separator meridian-column">&nbsp;</td><td class="meridian-column">${meridianTemplate}</td></tr><tr><td><a href="#" data-action="decrementHour"><span class="${
                this.icons.down
            }"></span></a></td><td class="separator"></td><td><a href="#" data-action="decrementMinute"><span class="${
                this.icons.down
            }"></span></a></td>${
                this.showSeconds
                    ? `<td class="separator">&nbsp;</td><td><a href="#" data-action="decrementSecond"><span class="${this.icons.down}"></span></a></td>`
                    : ''
            }<td class="separator meridian-column">&nbsp;</td><td class="meridian-column"><a href="#" data-action="toggleMeridian"><span class="${
                this.icons.down
            }"></span></a></td></tr></table>`;

            switch (this.template) {
                case 'dropdown':
                    template = `<div class="timepicker-widget dropdown-menu">${templateContent}</div>`;
                    break;
            }

            return template;
        },

        getTime() {
            if (this.hour === '') {
                return '';
            }

            // return this.hour +                                                           ':' + ( this.minute.toString().length === 1 ? '0' + this.minute : this.minute ) + ( this.showSeconds ? ':' + ( this.second.toString().length === 1 ? '0' + this.second : this.second ) : '' ) + ( this.showMeridian ? ' ' + this.meridian : '' );
            return `${
                this.hour.toString().length === 1 ? `0${this.hour}` : this.hour
            }:${
                this.minute.toString().length === 1
                    ? `0${this.minute}`
                    : this.minute
            }${
                this.showSeconds
                    ? `:${
                          this.second.toString().length === 1
                              ? `0${this.second}`
                              : this.second
                      }`
                    : ''
            }${this.showMeridian ? ` ${this.meridian}` : ''}`;
        },

        hideWidget() {
            if (this.isOpen === false) {
                return;
            }

            this.$widget.removeClass('open');

            $(document).off(
                'mousedown.timepicker, touchend.timepicker',
                this.handleDocumentClick
            );

            this.isOpen = false;
            // show/hide approach taken by datepicker
            this.$widget.detach();
        },

        highlightUnit() {
            this.position = this.getCursorPosition();
            if (this.position >= 0 && this.position <= 2) {
                this.highlightHour();
            } else if (this.position >= 3 && this.position <= 5) {
                this.highlightMinute();
            } else if (this.position >= 6 && this.position <= 8) {
                if (this.showSeconds) {
                    this.highlightSecond();
                } else {
                    this.highlightMeridian();
                }
            } else if (this.position >= 9 && this.position <= 11) {
                this.highlightMeridian();
            }
        },

        highlightNextUnit() {
            switch (this.highlightedUnit) {
                case 'hour':
                    this.highlightMinute();
                    break;
                case 'minute':
                    if (this.showSeconds) {
                        this.highlightSecond();
                    } else if (this.showMeridian) {
                        this.highlightMeridian();
                    } else {
                        this.highlightHour();
                    }
                    break;
                case 'second':
                    if (this.showMeridian) {
                        this.highlightMeridian();
                    } else {
                        this.highlightHour();
                    }
                    break;
                case 'meridian':
                    this.highlightHour();
                    break;
            }
        },

        highlightPrevUnit() {
            switch (this.highlightedUnit) {
                case 'hour':
                    if (this.showMeridian) {
                        this.highlightMeridian();
                    } else if (this.showSeconds) {
                        this.highlightSecond();
                    } else {
                        this.highlightMinute();
                    }
                    break;
                case 'minute':
                    this.highlightHour();
                    break;
                case 'second':
                    this.highlightMinute();
                    break;
                case 'meridian':
                    if (this.showSeconds) {
                        this.highlightSecond();
                    } else {
                        this.highlightMinute();
                    }
                    break;
            }
        },

        highlightHour() {
            const $element = this.$element.get(0);
            const self = this;

            this.highlightedUnit = 'hour';

            if ($element.setSelectionRange) {
                setTimeout(() => {
                    if (self.hour < 10) {
                        $element.setSelectionRange(0, 1);
                    } else {
                        $element.setSelectionRange(0, 2);
                    }
                }, 0);
            }
        },

        highlightMinute() {
            const $element = this.$element.get(0);
            const self = this;

            this.highlightedUnit = 'minute';

            if ($element.setSelectionRange) {
                setTimeout(() => {
                    if (self.hour < 10) {
                        $element.setSelectionRange(2, 4);
                    } else {
                        $element.setSelectionRange(3, 5);
                    }
                }, 0);
            }
        },

        highlightSecond() {
            const $element = this.$element.get(0);
            const self = this;

            this.highlightedUnit = 'second';

            if ($element.setSelectionRange) {
                setTimeout(() => {
                    if (self.hour < 10) {
                        $element.setSelectionRange(5, 7);
                    } else {
                        $element.setSelectionRange(6, 8);
                    }
                }, 0);
            }
        },

        highlightMeridian() {
            const $element = this.$element.get(0);
            const self = this;

            this.highlightedUnit = 'meridian';

            if ($element.setSelectionRange) {
                if (this.showSeconds) {
                    setTimeout(() => {
                        if (self.hour < 10) {
                            $element.setSelectionRange(8, 10);
                        } else {
                            $element.setSelectionRange(9, 11);
                        }
                    }, 0);
                } else {
                    setTimeout(() => {
                        if (self.hour < 10) {
                            $element.setSelectionRange(5, 7);
                        } else {
                            $element.setSelectionRange(6, 8);
                        }
                    }, 0);
                }
            }
        },

        getCurrentHour() {
            const h24 = new Date().getHours();

            return this.showMeridian ? h24 % 12 : h24;
        },

        getCurrentMinute() {
            return new Date().getMinutes();
        },

        incrementHour() {
            // If value is empty, make sure that first shown value is current hour.
            if (this.hour === '') {
                this.hour = this.getCurrentHour();
                this.decrementHour();
            }

            // if this.hour is empty string
            if (this.showMeridian) {
                if (this.hour === 11) {
                    this.hour++;

                    return this.toggleMeridian();
                }
                if (this.hour === 12) {
                    this.hour = 0;
                }
            }
            if (this.hour === this.maxHours - 1) {
                this.hour = 0;

                return;
            }
            this.hour++;
        },

        incrementMinute(step) {
            let newVal;

            // If value is empty, make sure that first shown value is current minutes.
            if (this.minute === '') {
                this.minute = this.getCurrentMinute();
                this.decrementMinute();
            }

            if (step) {
                newVal = this.minute + step;
            } else {
                newVal =
                    this.minute +
                    this.minuteStep -
                    (this.minute % this.minuteStep);
            }

            if (newVal > 59) {
                this.incrementHour();
                this.minute = newVal - 60;
            } else {
                this.minute = newVal;
            }
        },

        incrementSecond() {
            const newVal =
                this.second + this.secondStep - (this.second % this.secondStep);

            if (newVal > 59) {
                this.incrementMinute(true);
                this.second = newVal - 60;
            } else {
                this.second = newVal;
            }
        },

        mousewheel(e) {
            if (this.disableMousewheel) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const delta = e.originalEvent.wheelDelta || -e.originalEvent.detail;
            let scrollTo = null;

            if (e.type === 'mousewheel') {
                scrollTo = e.originalEvent.wheelDelta * -1;
            } else if (e.type === 'DOMMouseScroll') {
                scrollTo = 40 * e.originalEvent.detail;
            }

            if (scrollTo) {
                e.preventDefault();
                $(this).scrollTop(scrollTo + $(this).scrollTop());
            }

            switch (this.highlightedUnit) {
                case 'minute':
                    if (delta > 0) {
                        this.incrementMinute();
                    } else {
                        this.decrementMinute();
                    }
                    this.highlightMinute();
                    break;
                case 'second':
                    if (delta > 0) {
                        this.incrementSecond();
                    } else {
                        this.decrementSecond();
                    }
                    this.highlightSecond();
                    break;
                case 'meridian':
                    this.toggleMeridian();
                    this.highlightMeridian();
                    break;
                default:
                    if (delta > 0) {
                        this.incrementHour();
                    } else {
                        this.decrementHour();
                    }
                    this.highlightHour();
                    break;
            }

            return false;
        },

        /**
         * Given a segment value like 43, will round and snap the segment
         * to the nearest "step", like 45 if step is 15. Segment will
         * "overflow" to 0 if it's larger than 59 or would otherwise
         * round up to 60.
         *
         * @param {number} segment - The segment value
         * @param {number} step - The step
         */
        changeToNearestStep(segment, step) {
            if (segment % step === 0) {
                return segment;
            }
            if (Math.round((segment % step) / step)) {
                return (segment + (step - (segment % step))) % 60;
            }
            return segment - (segment % step);
        },

        // This method was adapted from datepicker.
        place() {
            if (this.isInline) {
                return;
            }
            const widgetWidth = this.$widget.outerWidth();
            const widgetHeight = this.$widget.outerHeight();
            const visualPadding = 10;
            const windowWidth = $(window).width();
            const windowHeight = $(window).height();
            const scrollTop = $(window).scrollTop();

            const zIndex =
                parseInt(
                    this.$element
                        .parents()
                        .filter(function () {
                            return $(this).css('z-index') !== 'auto';
                        })
                        .first()
                        .css('z-index'),
                    10
                ) + 10;
            const offset = this.component
                ? this.component.parent().offset()
                : this.$element.offset();
            const height = this.component
                ? this.component.outerHeight(true)
                : this.$element.outerHeight(false);
            const width = this.component
                ? this.component.outerWidth(true)
                : this.$element.outerWidth(false);
            let { left } = offset;
            let { top } = offset;

            this.$widget.removeClass(
                'timepicker-orient-top timepicker-orient-bottom timepicker-orient-right timepicker-orient-left'
            );

            if (this.orientation.x !== 'auto') {
                this.$widget.addClass(
                    `timepicker-orient-${this.orientation.x}`
                );
                if (this.orientation.x === 'right') {
                    left -= widgetWidth - width;
                }
            } else {
                // auto x orientation is best-placement: if it crosses a window edge, fudge it sideways
                // Default to left
                this.$widget.addClass('timepicker-orient-left');
                if (offset.left < 0) {
                    left -= offset.left - visualPadding;
                } else if (offset.left + widgetWidth > windowWidth) {
                    left = windowWidth - widgetWidth - visualPadding;
                }
            }
            // auto y orientation is best-situation: top or bottom, no fudging, decision based on which shows more of the widget
            let yorient = this.orientation.y;
            let topOverflow;
            let bottomOverflow;
            if (yorient === 'auto') {
                topOverflow = -scrollTop + offset.top - widgetHeight;
                bottomOverflow =
                    scrollTop +
                    windowHeight -
                    (offset.top + height + widgetHeight);
                if (Math.max(topOverflow, bottomOverflow) === bottomOverflow) {
                    yorient = 'top';
                } else {
                    yorient = 'bottom';
                }
            }
            this.$widget.addClass(`timepicker-orient-${yorient}`);
            if (yorient === 'top') {
                top += height;
            } else {
                top -=
                    widgetHeight +
                    parseInt(this.$widget.css('padding-top'), 10);
            }

            this.$widget.css({
                top,
                left,
                zIndex,
            });
        },

        remove() {
            $('document').off('.timepicker');
            if (this.$widget) {
                this.$widget.remove();
            }
            delete this.$element.data().timepicker;
        },

        setDefaultTime(defaultTime) {
            if (!this.$element.val()) {
                if (defaultTime === 'current') {
                    const dTime = new Date();
                    let hours = dTime.getHours();
                    let minutes = dTime.getMinutes();
                    let seconds = dTime.getSeconds();
                    let meridian = this.meridianNotation.am;

                    if (seconds !== 0) {
                        seconds =
                            Math.ceil(dTime.getSeconds() / this.secondStep) *
                            this.secondStep;
                        if (seconds === 60) {
                            minutes += 1;
                            seconds = 0;
                        }
                    }

                    if (minutes !== 0) {
                        minutes =
                            Math.ceil(dTime.getMinutes() / this.minuteStep) *
                            this.minuteStep;
                        if (minutes === 60) {
                            hours += 1;
                            minutes = 0;
                        }
                    }

                    if (this.showMeridian) {
                        if (hours === 0) {
                            hours = 12;
                        } else if (hours >= 12) {
                            if (hours > 12) {
                                hours -= 12;
                            }
                            meridian = this.meridianNotation.pm;
                        } else {
                            meridian = this.meridianNotation.am;
                        }
                    }

                    this.hour = hours;
                    this.minute = minutes;
                    this.second = seconds;
                    this.meridian = meridian;

                    this.update();
                } else if (defaultTime === false) {
                    this.hour = 0;
                    this.minute = 0;
                    this.second = 0;
                    this.meridian = this.meridianNotation.am;
                } else {
                    this.setTime(defaultTime);
                }
            } else {
                this.updateFromElementVal();
            }
        },

        setTime(time, ignoreWidget) {
            if (!time) {
                this.clear();

                return;
            }

            let timeMode;
            let timeArray;
            let hour;
            let minute;
            let second;
            let meridian;

            if (typeof time === 'object' && time.getMonth) {
                // this is a date object
                hour = time.getHours();
                minute = time.getMinutes();
                second = time.getSeconds();

                if (this.showMeridian) {
                    meridian = this.meridianNotation.am;
                    if (hour > 12) {
                        meridian = this.meridianNotation.pm;
                        hour %= 12;
                    }

                    if (hour === 12) {
                        meridian = this.meridianNotation.pm;
                    }
                }
            } else {
                const am = this.showMeridian ? this.meridianNotation.am : 'am';
                const pm = this.showMeridian ? this.meridianNotation.pm : 'pm';
                timeMode =
                    (new RegExp(am, 'i').test(time) ? 1 : 0) +
                    (new RegExp(pm, 'i').test(time) ? 2 : 0); // 0 = none, 1 = AM, 2 = PM, 3 = BOTH.
                if (timeMode > 2) {
                    // If both are present, fail.
                    this.clear();

                    return;
                }

                timeArray = time.replace(/[^0-9:]/g, '').split(':');

                hour = timeArray[0]
                    ? timeArray[0].toString()
                    : timeArray.toString();

                if (
                    this.explicitMode &&
                    hour.length > 2 &&
                    hour.length % 2 !== 0
                ) {
                    this.clear();

                    return;
                }

                minute = timeArray[1] ? timeArray[1].toString() : '';
                second = timeArray[2] ? timeArray[2].toString() : '';

                // adaptive time parsing
                if (hour.length > 4) {
                    second = hour.slice(-2);
                    hour = hour.slice(0, -2);
                }

                if (hour.length > 2) {
                    minute = hour.slice(-2);
                    hour = hour.slice(0, -2);
                }

                if (minute.length > 2) {
                    second = minute.slice(-2);
                    minute = minute.slice(0, -2);
                }

                hour = parseInt(hour, 10);
                minute = parseInt(minute, 10);
                second = parseInt(second, 10);

                if (isNaN(hour)) {
                    hour = 0;
                }
                if (isNaN(minute)) {
                    minute = 0;
                }
                if (isNaN(second)) {
                    second = 0;
                }

                // Adjust the time based upon unit boundary.
                // NOTE: Negatives will never occur due to time.replace() above.
                if (second > 59) {
                    second = 59;
                }

                if (minute > 59) {
                    minute = 59;
                }

                if (hour >= this.maxHours) {
                    // No day/date handling.
                    hour = this.maxHours - 1;
                }

                if (this.showMeridian) {
                    if (hour >= 12) {
                        // Force PM.
                        if (!timeMode) {
                            timeMode = 2;
                        }
                        hour -= 12;
                    }
                    if (!timeMode) {
                        timeMode = 1;
                    }
                    if (hour === 0) {
                        hour = 12; // AM or PM, reset to 12.  0 AM = 12 AM.  0 PM = 12 PM, etc.
                    }
                    meridian =
                        timeMode === 1
                            ? this.meridianNotation.am
                            : this.meridianNotation.pm;
                } else if (hour < 12 && timeMode === 2) {
                    hour += 12;
                } else if (hour >= this.maxHours) {
                    hour = this.maxHours - 1;
                } else if (hour < 0 || (hour === 12 && timeMode === 1)) {
                    hour = 0;
                }
            }

            this.hour = hour;
            if (this.snapToStep) {
                this.minute = this.changeToNearestStep(minute, this.minuteStep);
                this.second = this.changeToNearestStep(second, this.secondStep);
            } else {
                this.minute = minute;
                this.second = second;
            }
            this.meridian = meridian;

            this.update(ignoreWidget);
        },

        showWidget() {
            if (this.isOpen) {
                return;
            }

            if (this.$element.is(':disabled')) {
                return;
            }

            // make sure the widget is in sync with input
            this.setTime(this.$element.val());
            this.updateWidget();

            // show/hide approach taken by datepicker
            this.$widget.appendTo(this.appendWidgetTo);
            $(document).on(
                'mousedown.timepicker, touchend.timepicker',
                {
                    scope: this,
                },
                this.handleDocumentClick
            );

            this.place();
            if (this.disableFocus) {
                this.$element.blur();
            }

            if (this.hour === '') {
                if (this.defaultTime) {
                    this.setDefaultTime(this.defaultTime);
                }
            }

            if (this.isOpen === false) {
                this.$widget.addClass('open');
            }

            this.isOpen = true;
        },

        toggleMeridian() {
            this.meridian =
                this.meridian === this.meridianNotation.am
                    ? this.meridianNotation.pm
                    : this.meridianNotation.am;
        },

        update(ignoreWidget) {
            this.updateElement();
            if (!ignoreWidget) {
                this.updateWidget();
            }
        },

        updateElement() {
            this.$element.val(this.getTime());
            this.$element[0].dispatchEvent(event.Change());
        },

        updateFromElementVal() {
            this.setTime(this.$element.val());
        },

        updateWidget() {
            if (this.$widget === false) {
                return;
            }

            const { hour } = this;
            const minute =
                this.minute.toString().length === 1
                    ? `0${this.minute}`
                    : this.minute;
            const second =
                this.second.toString().length === 1
                    ? `0${this.second}`
                    : this.second;

            if (this.showInputs) {
                this.$widget.find('input.timepicker-hour').val(hour);
                this.$widget.find('input.timepicker-minute').val(minute);

                if (this.showSeconds) {
                    this.$widget.find('input.timepicker-second').val(second);
                }
                if (this.showMeridian) {
                    this.$widget
                        .find('input.timepicker-meridian')
                        .val(this.meridian);
                }
            } else {
                this.$widget.find('span.timepicker-hour').text(hour);
                this.$widget.find('span.timepicker-minute').text(minute);

                if (this.showSeconds) {
                    this.$widget.find('span.timepicker-second').text(second);
                }
                if (this.showMeridian) {
                    this.$widget
                        .find('span.timepicker-meridian')
                        .text(this.meridian);
                }
            }

            const { showMeridian } = this;
            const meridianDisplay = showMeridian ? 'table-cell' : 'none';

            this.meridianColumns.forEach((column) => {
                column.style.display = meridianDisplay;
            });
        },

        updateLocalization() {
            if (this.languages !== navigator.languages) {
                this.languages = navigator.languages;
                this.updateFromElementVal();
                this.updateWidget();
            }
        },

        updateFromWidgetInputs() {
            if (this.$widget === false) {
                return;
            }

            const t = `${this.$widget
                .find('input.timepicker-hour')
                .val()}:${this.$widget.find('input.timepicker-minute').val()}${
                this.showSeconds
                    ? `:${this.$widget.find('input.timepicker-second').val()}`
                    : ''
            }${
                this.showMeridian
                    ? this.$widget.find('input.timepicker-meridian').val()
                    : ''
            }`;

            this.setTime(t, true);
        },

        widgetClick(e) {
            e.stopPropagation();
            e.preventDefault();

            const $input = $(e.target);
            const action = $input.closest('a').data('action');

            if (action) {
                this[action]();
            }
            this.update();

            if ($input.is('input')) {
                $input.get(0).setSelectionRange(0, 2);
            }
        },

        widgetKeydown(e) {
            const $input = $(e.target);
            const name = $input.attr('class').replace('timepicker-', '');

            switch (e.which) {
                case 9: // tab
                    if (e.shiftKey) {
                        if (name === 'hour') {
                            return this.hideWidget();
                        }
                    } else if (
                        (this.showMeridian && name === 'meridian') ||
                        (this.showSeconds && name === 'second') ||
                        (!this.showMeridian &&
                            !this.showSeconds &&
                            name === 'minute')
                    ) {
                        return this.hideWidget();
                    }
                    break;
                case 27: // escape
                    this.hideWidget();
                    break;
                case 38: // up arrow
                    e.preventDefault();
                    switch (name) {
                        case 'hour':
                            this.incrementHour();
                            break;
                        case 'minute':
                            this.incrementMinute();
                            break;
                        case 'second':
                            this.incrementSecond();
                            break;
                        case 'meridian':
                            this.toggleMeridian();
                            break;
                    }
                    this.setTime(this.getTime());
                    $input.get(0).setSelectionRange(0, 2);
                    break;
                case 40: // down arrow
                    e.preventDefault();
                    switch (name) {
                        case 'hour':
                            this.decrementHour();
                            break;
                        case 'minute':
                            this.decrementMinute();
                            break;
                        case 'second':
                            this.decrementSecond();
                            break;
                        case 'meridian':
                            this.toggleMeridian();
                            break;
                    }
                    this.setTime(this.getTime());
                    $input.get(0).setSelectionRange(0, 2);
                    break;
            }
        },

        widgetKeyup(e) {
            if (
                e.which === 65 ||
                e.which === 77 ||
                e.which === 80 ||
                e.which === 46 ||
                e.which === 8 ||
                (e.which >= 48 && e.which <= 57) ||
                (e.which >= 96 && e.which <= 105)
            ) {
                this.updateFromWidgetInputs();
            }
        },
    };

    // TIMEPICKER PLUGIN DEFINITION
    $.fn.timepicker = function (option, ...rest) {
        return this.each(function () {
            const $this = $(this);
            let data = $this.data('timepicker');
            const options = typeof option === 'object' && option;

            if (!data) {
                $this.data(
                    'timepicker',
                    (data = new Timepicker(
                        this,
                        $.extend(
                            {},
                            $.fn.timepicker.defaults,
                            options,
                            $(this).data()
                        )
                    ))
                );
            }

            if (typeof option === 'string') {
                data[option](...rest);
            }
        });
    };

    $.fn.timepicker.defaults = {
        defaultTime: 'current',
        disableFocus: false,
        disableMousewheel: false,
        isOpen: false,
        minuteStep: 15,
        orientation: {
            x: 'auto',
            y: 'auto',
        },
        secondStep: 15,
        snapToStep: false,
        showSeconds: false,
        showInputs: true,
        showMeridian: true,
        meridianNotation: {
            am: 'AM',
            pm: 'PM',
        },
        template: 'dropdown',
        appendWidgetTo: 'body',
        showWidgetOnAddonClick: true,
        icons: {
            up: 'glyphicon glyphicon-chevron-up',
            down: 'glyphicon glyphicon-chevron-down',
        },
        maxHours: 24,
        explicitMode: false,
    };

    $.fn.timepicker.Constructor = Timepicker;

    $(document).on(
        'focus.timepicker.data-api click.timepicker.data-api',
        '[data-provide="timepicker"]',
        function (e) {
            const $this = $(this);
            if ($this.data('timepicker')) {
                return;
            }
            e.preventDefault();
            // component click requires us to explicitly show it
            $this.timepicker();
        }
    );
})($, window, document);
