import {
    getTimezoneOffsetAsTime,
    toISOLocalString,
} from 'openrosa-xpath-evaluator/src/date-extensions';
import $ from 'jquery';
import Widget from '../../js/widget';
import support from '../../js/support';
import { os, browser } from '../../js/sniffer';
import { time as timeFormat } from '../../js/format';
import types from '../../js/types';
import events from '../../js/event';
import '../../js/extend';
import 'bootstrap-datepicker';
import '../time/timepicker';
import '../../js/dropdown.jquery';

/**
 * @augments Widget
 */
class DatetimepickerExtended extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.question input[type="datetime-local"]:not([readonly])';
    }

    /**
     * @return {boolean} to instantiate or not to instantiate, that is the question
     */
    static condition() {
        return !support.touch || !support.inputTypes['datetime-local'];
    }

    _init() {
        this.$fakeDateI = this._createFakeDateInput();
        this.$fakeTimeI = this._createFakeTimeInput();

        this.element.classList.add('hide');
        this.element.before(
            document
                .createRange()
                .createContextualFragment(
                    '<div class="datetimepicker widget" />'
                )
        );
        const widget = this.question.querySelector('.widget');
        widget.append(this.$fakeDateI[0].closest('.date'));
        widget.append(this.$fakeTimeI[0].closest('.timepicker'));

        this.$fakeDateI.datepicker({
            format: 'yyyy-mm-dd',
            autoclose: true,
            todayHighlight: true,
            forceParse: false,
        });

        this.$fakeTimeI.timepicker({
            showMeridian: timeFormat.hour12,
            meridianNotation: {
                am: timeFormat.amNotation,
                pm: timeFormat.pmNotation,
            },
        });

        this.value = this.originalInputValue;

        this._setFocusHandler(this.$fakeDateI.add(this.$fakeTimeI));

        this.$fakeDateI.on('change changeDate', () => {
            if (!types.date.validate(this.$fakeDateI[0].value)) {
                this.$fakeDateI.val('').datepicker('update');
            }
            this.originalInputValue = this.value;

            return false;
        });

        this.$fakeTimeI.on('change', () => {
            this.originalInputValue = this.value;

            return false;
        });

        // reset button
        this.question
            .querySelector('.btn-reset')
            .addEventListener('click', () => {
                const event = this.originalInputValue ? 'change' : '';
                if (event || this.$fakeDateI.val() || this.$fakeTimeI.val()) {
                    this.$fakeDateI.val('').trigger(event).datepicker('update');
                    this.$fakeTimeI.val('').trigger(event);
                }
            });
    }

    /**
     * @return {Element} fake date input
     */
    _createFakeDateInput() {
        const $fakeDate = $(
            '<div class="date">' +
                '<input class="ignore" type="text" placeholder="yyyy-mm-dd"/>' +
                '</div>'
        );

        return $fakeDate.find('input');
    }

    /**
     * @return {Element} fake time input
     */
    _createFakeTimeInput() {
        const $fakeTime = $(
            `<div class="timepicker">
                    <input class="ignore timepicker-default" type="text" placeholder="hh:mm"/>
                </div>`
        ).append(this.resetButtonHtml);

        return $fakeTime.find('input');
    }

    /**
     * @param {jQuery} $els - a set of elements wrapped in jQuery
     */
    _setFocusHandler($els) {
        // Handle focus on original input (goTo functionality)
        this.element.addEventListener(events.ApplyFocus().type, () => {
            $els.eq(0).focus();
        });
    }

    update() {
        const $dateTimeI = $(this.element);
        let val =
            $dateTimeI.val().length > 0
                ? toISOLocalString(new Date($dateTimeI.val()))
                : '';
        /**
         * fix a bug which is only on safari (#745)
         * If the local timezone is +08:00, for a date value of new Date('2020-10-10T13:10:10') will be:
         * *** in chrome, the value is: Sat Oct 10 2020 13:10:10 GMT+0800 (China Standard Time)
         * *** but in safari, the value is: Sat Oct 10 2020 21:10:10 GMT+0800 (CST)
         * so we have to append the timezone here
         */
        if (os.macos && browser.safari) {
            val =
                $dateTimeI.val().length > 0
                    ? toISOLocalString(
                          new Date(
                              $dateTimeI.val() +
                                  getTimezoneOffsetAsTime(new Date())
                          )
                      )
                    : '';
        }

        if (val !== this.value) {
            const vals = val.split('T');
            const dateVal = vals[0];
            const timeVal =
                vals[1] && vals[1].length > 4 ? vals[1].substring(0, 5) : '';

            this.$fakeDateI.datepicker('setDate', dateVal);
            this.$fakeTimeI.timepicker('setTime', timeVal);
        }

        this.$fakeTimeI.timepicker('updateLocalization');
    }

    get originalInputValue() {
        const originalInputValue = super.originalInputValue;

        if (originalInputValue === '') {
            return '';
        }

        return toISOLocalString(new Date(originalInputValue));
    }

    set originalInputValue(value) {
        super.originalInputValue = value;
    }

    /**
     * @type {string}
     */
    get value() {
        if (
            this.$fakeDateI.val().length > 0 &&
            this.$fakeTimeI.val().length > 3
        ) {
            const d = this.$fakeDateI.val().split('-');
            const timeModified = timeFormat.hour12
                ? types.time.convertMeridian(this.$fakeTimeI.val())
                : this.$fakeTimeI.val();
            const t = timeModified.split(':');

            return toISOLocalString(new Date(d[0], d[1] - 1, d[2], t[0], t[1]));
        }
        return '';
    }

    set value(value) {
        /*
          Loaded or default datetime values remain untouched until they are edited. This is done to preserve
          the timezone information (especially for instances-to-edit) if the values are not edited (the
          original entry may have been done in a different time zone than the edit). However,
          values shown in the widget should reflect the local time representation of that value.
         */
        const val = value ? toISOLocalString(new Date(value)) : '';
        const vals = val.split('T');
        const dateVal = vals[0];
        /**
         * seems the source of issue #649 is in the toISOLocalString function
         * refer: https://github.com/enketo/enketo-xpathjs/blob/master/src/date-extensions.js#L16
         */
        const timeVal =
            vals[1] && vals[1].length > 4
                ? vals[1].substring(0, 5)
                : dateVal && !vals[1]
                ? '00:00'
                : '';
        this.$fakeDateI.datepicker('setDate', dateVal);
        this.$fakeTimeI.timepicker('setTime', timeVal);
    }
}

export default DatetimepickerExtended;
