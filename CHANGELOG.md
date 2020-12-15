Change Log
=========
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

[Unreleased]
-----------------------
##### Fixed
- An exception occurs when a repeat is deleted.
- When a calculation becomes non-relevant, values are sometimes cleared (they should stay).

[5.16.12] - 2020-12-04
-----------------------
##### Changed
- setvalue/odk-instance-first-load actions without form controls are evaluated (in form order) before setvalue/odk-instance-first-load actions with form controls (in form order)

[5.16.11] - 2020-12-02
-----------------------
##### Fixed
- Print/pdf view creates image-map that overlaps in cell below with Grid theme (#744).
- In Safari on MacOS, dates are offset incorrectly by the UTC offset.
- Grid Theme designed for rows with 9 or 10 cells display 1 cell too many.
- Inconsistent and unsafe HTML rendering of select minimal labels and values.
- Primary instance node names starting with underscore followed by number, break autocomplete widget.

[5.16.10] - 2020-11-18
-----------------------
##### Changed
- Improved timings of print script for Grid Theme forms

##### Fixed
- Geopicker on mobile devices won't show map any more after first map reveal.
- jr:choice-name not working for questions with radiobuttons.
- If a ref or nodeset attribute starts with a space, the absolute path is not determined correctly (enketo-transformer).

[5.16.9] - 2020-09-28
-----------------------
##### Fixed
- In custom (OC) analog-scale widget, if the widget itself is a page (not its parent group), it is not hidden when it should be when the page is not current.
- When pasting an invalid number into a number field with an existing value, the existing value does not get cleared in the model.

[5.16.8] - 2020-08-28
----------------------
##### Added
- In custom (OC) analog-scale widget support for `show-scale` appearance for vertical widgets using int/decimal.

##### Changed
- Ordered markdown lists should always be preceded by a newline character because it's very common to number labels in forms(enketo-transformer).

[5.16.7] - 2020-08-13
----------------------
##### Changed
- Removed animation when removing a repeat.

##### Fixed
- When a `setvalue` element has no `value` attribute and no textContent, it does not work for resetting values(enketo-transformer fix).
- When nested repeats using jr:count have values that empty or 0, a nested repeat can never be created (exception)

[5.16.6] - 2020-08-03
----------------------
##### Fixed
- Readonly empty fields are displayed but should be invisible (recent regression).

[5.16.5] - 2020-08-03
----------------------
##### Changed
- Let cookie access attempt fail silently in context where document.cookie is not accessible and throws an exception.

##### Fixed
- Xforms-version check relies on specific namespace prefix.
- jr:choice-name() not working if parameters are relative paths.

[5.16.4] - 2020-07-23
----------------------
##### Changed
- Markdown lists no longer require preceding newline (enketo-transformer).
- Markdown ordered lists detect non-1 numbering start (enketo-transformer).
- Add rel="noopener" to markdown links (enketo-transformer).
- Focus date/time/datetime pickers when clicking label.

##### Fixed
- Pulldata fails to work when the search value looks like a number in scientific notation.
- Readonly text fields with overflowing text have invisible overflow on printouts.
- Textarea contains unnecessary space character (enketo-transformer).
- In Firefox the native datepicker launches when the question label is clicked.

[5.16.3] - 2020-07-09
----------------------
##### Changed
- Changed when dataupdate event is fired for setvalue/odk-instance-first-load actions to facilitate custom clients with field submission (like OpenClinica).
- Speed up loading.

[5.16.2] - 2020-06-12
----------------------
##### Changed
- Made fixed English geopicker warning translatable.

##### Fixed
- The "selected" message in the desktop select picker does not switch language immediately.
- Image-map widget is transparent, not visible but functional, when it is included on a non-first page.

[5.16.1] - 2020-06-05
----------------------
##### Fixed
- Readonly select-minimal widgets are not readonly.
- Readonly select-minimal widget get erroneously enabled when relevancy changes to positive.
- Calculation with form control fires input-update event upon load if the underlying model value doesn't change.
- Number mask do not work in non-first repeat instances.

[5.16.0] - 2020-05-28
----------------------
##### Removed
- Configuration option `clearIrrelevantImmediately`. Non-relevant values are never immediately cleared.

##### Changed
- Changed external instance XML document type check for Enketo Validate use.

[5.15.5] - 2020-05-27
----------------------
##### Fixed
- Date fields in Grid Theme do not show values in print view.
- Itemsets inside a non-relevant groups or questions are not updated when group becomes relevant if choice_filter condition does not include node that makes group/question relevant.

[5.15.4] - 2020-05-15
----------------------
##### Changed
- Code style

##### Fixed
- SVG image in image-map widget is not always displayed in its entirety. Any SVG-specified `viewBox` attribute is overwritten.
- SVG `<circle>` element with `id` attribute is not working in the image-map widget.
- SVG `<circle>` element with a parent `<g>` element with an id attribute is not working in the image-map widget.
- Geo widget update function doesn't redraw a map, e.g. when changing language.

[5.15.3] - 2020-05-12
---------------------
##### Fixed
- When printing long text it overflows into the question below.

[5.15.2] - 2020-05-05
---------------------
##### Fixed
- Textarea not resizing correctly when printing in pages mode.

[5.15.1] - 2020-05-01
---------------------
##### Changed
- The resetView method now returns the new form element.

[5.15.0] - 2020-04-24
----------------------
##### Added
- Support for multiple setvalue/xforms-value-changed actions under the same form control.
- A "goto-invisible" event to trigger when a "goto" instruction points to a field without a form control.

##### Fixed
- Border shown when printing a Grid Theme form.

[5.14.3] - 2020-04-15
----------------------
##### Fixed
- When instantiating a single-language form with an explicit language override, itemsets may fail to populate.
- Empty readonly text fields take up unnecessary space in the print view.
- Non-relevant questions in Grid theme are not getting the correct width in the print view.

[5.14.2] - 2020-04-14
----------------------
##### Changed
- Form instantiation now recommended with form Element instead of form selector.
- Prepared for language syncing feature in Enketo Express.

##### Fixed
- The dotted lines on Grid theme printouts are not positioned at the bottom of cells.
- A text question on Grid theme printouts that has only text questions on the same row (or nothing else), has too little space to write.
- Date/datetime/time questions take up too much vertical space on Grid theme printouts.

[5.14.1] - 2020-03-31
----------------------
##### Fixed
- Loading error if multiple autocomplete questions with static lists are used inside a repeat (regression in 5.14.0)

[5.14.0] - 2020-03-27
----------------------
##### Removed
- Example IE11 build tasks and loading tricks.

##### Changed
- Improved performance of autocomplete questions inside repeats that use static option lists.

##### Fixed
- Option label images in Likert widget are not centered below text.

[5.13.2] - 2020-03-20
----------------------
##### Fixed
- If last element of last row of form with Grid theme is hidden, the cells of that last row are not resized properly in the print view.
- Textareas not resizing in pages mode when loading large text values on non-first pages.


[5.13.1] - 2020-02-28
----------------------
##### Fixed
- `jr:count` does not work if number is provided instead of /path/to/count.
- Date calculations in readonly fields do not show a value if not loaded from record.

[5.13.0] - 2020-02-14
----------------------
##### Changed
- The odk:generated-by attribute check on the primary instance (introduced in 5.11.0), was changed to a check for odk:xforms-version on the model node.

##### Fixed
- Readonly date widgets can be edited or reset (regression in 5.12.0).

[5.12.0] - 2020-02-12
---------------------
##### Added
- Support for setvalue action with xforms-value-changed event.
- Basic support for "thousands-sep" appearance on integer and decimal fields.

##### Changed
- No longer trigger an inputupdate event when loading an existing itemset value.
- "valuechange" event was changed to "xforms-value-changed" (TBC!)

##### Fixed
- Text-print widget causes double URL to be shown in print view for URL widget.
- Last row of Grid Theme form may have incorrect cell heights.
- Readonly month-year or year inputs show full underlying value instead of month-year/year.

[5.11.7] - 2020-01-28
---------------------
##### Fixed
- Exception occurs when first repeat is created that contains a calculation if `validateContinuously` is set to `true`.
- Rows are not always stretching correctly when printing Grid Theme forms.

[5.11.6] - 2020-01-22
---------------------
##### Fixed
- Text-print widget is also instantiated for comment widgets, causing an issue for a customized Enketo Express application.
- If repeats are removed in pages mode, the pages get messed up.
- If repeats are added in pages mode during form load (default instances or loading existing record with multiple instances), the Next/Back buttons are not updated when they should be.

[5.11.5] - 2020-01-21
---------------------
##### Fixed
- Forms in pages mode sometimes do not show correct first page upon load (regression since 5.11.3).
- Forms in pages mode with groups or repeats without field-list appearance show empty pages (regression since 5.11.3).

[5.11.4] - 2020-01-20
---------------------
##### Fixed
- Radiobutton questions inside repeats allow multiple selections (regression since 5.11.0).
- Comment questions in a form in Pages mode without field-list appearances, add an empty page.

[5.11.2] - 2020-01-10
---------------------
##### Fixed
- Annotation and draw widget on mobile devices slightly decrease image size every time a switch between fullscreen (draw) view and full form view.
- Annotation widget on mobile devices reveals keyboard when the colorpicker is clicked.

[5.11.1] - 2020-01-06
---------------------
##### Changed
- No longer trigger an inputupdate event when setting default values in view.

##### Fixed
- Annotate widget broken when uploading new image.

[5.11.0] - 2019-12-31
---------------------
##### Added
- Support for setvalue action with odk-new-repeat and odk-instance-first-load events.

##### Fixed
- Forms with a `odk:generated-by` attribute on the primary instance child, will always have absolute repeat node references evaluated correctly (e.g. for forms generated by pyxform 1.0.0 onwards).

[5.10.0] - 2019-12-18
---------------------
##### Added
- Support for default drawings in all 3 drawing widgets.

##### Fixed
- Some PDF viewers do not show radiobuttons with an opacity (e.g. a disabled radio button).
- MS Edge does not show any checkmarks in printouts of radiobuttons and checkboxes.
- Overflowing content in text form controls is not shown on printout.

[5.9.2] - 2019-11-22
---------------------
##### Fixed
- `current()` without a path, and `current()/path/to/node` without a step down do not work.
- Datetime picker does not load a midnight datetime value.
- Analog scale layout messed up in printout.

[5.9.1] - 2019-11-04
---------------------
##### Fixed
- If a predicate consists of parts that contain multiple `current()` calls, the expression is not evaluated correctly (noticeable inside repeats for multiple-choice questions with complex choice filters).

[5.9.0] - 2019-10-23
---------------------
##### Changed
- Now using native datetime picker on mobile browsers.

##### Fixed
- Option labels break in middle of word instead of a space.
- Readonly native date/time/datetime picker in iOS is fully functional when it should not be (re-introduced bug in iOS13).
- Exception in geo widget (though may not have had negative consequences).

[5.8.0] - 2019-10-04
--------------------
##### Added
- Rating widget!

##### Changed
- ToC now matches ODK Collect and shows all questions hierarchically.

##### Fixed
- time/datetime with time between 12:00 and 13:00 not set to PM.
- time picker in datetime shows empty value if the default value of datetime is at midnight.
- AM/PM notation broken in time/datetime picker for non-english languages.

[5.7.2] - 2019-09-11
--------------------
##### Changed
- Dependencies (maintenance).

[5.7.1] - 2019-09-09
--------------------
##### Changed
- XPath functions `decimal-time()` and `decimal-date-time()` now use maximum precision instead of rounding to 3 decimals.

##### Fixed
- Analog scale widget layout messed up in Grid Theme on IE11.

[5.7.0] - 2019-09-05
--------------------
##### Added
- Support for "picker" appearance on range question (100% in enketo-transformer actually)

##### Fixed
- Datepicker widget cause infinite loops with certain custom extensions that update values programmatically.

[5.6.0] - 2019-08-20
--------------------
##### Removed
- ESRI ArcGIS geopicker (moved [here]https://github.com/enketo/enketo-arcgis-geo-widget)

[5.5.2] - 2019-08-07
--------------------
##### Changed
- Show warning if select_multiple option contains spaces in value.
- Guidance hints are now displayed on screen as collapsible element.

##### Fixed
- Likert widget label in Grid Theme overlaps widget in print view.

[5.5.1] - 2019-07-12
--------------------
##### Changed
- Developer documentation update.
- Major dependencies update.

[5.5.0] - 2019-07-09
--------------------
##### Added
- Support for max-pixel attribute.

##### Changed
- Improvements to print style (group header size, opacity of disabled questions, line-height in Grid Theme)\
- Improved print style of select minimal widget.

##### Fixed
- Long words break out of cell in Grid Theme.
- Workaround for an iOS browser bug where a readonly date input is actually fully functional.

[5.4.1] - 2019-06-10
--------------------
##### Fixed
- Disabled analog-scale widget is still visible.
- Tests in enketo-express fail due to npm packaging issue.

[5.4.0] - 2019-06-05
--------------------
##### Added
- An option to override the default XForm language during form instantiation.
- Developer documentation.

##### Changed
- Made preparations for apps to dynamically switch the language of non-form-defined strings.

##### Fixed
- Dependency/build issue with 'sortable not defined'.
- Form control value getter for complex third-party widgets may get a false value.

[5.3.0] - 2019-05-21
--------------------
##### Removed
- Support for appearances "quick" and "quickcompact".

##### Added
- Support for appearances "columns", "columns-pack", "columns-n" all with an optional "no-buttons" modifier

##### Fixed
- Automatically enlarged multiline inputs cannot be manually resized to their original size.

[5.2.8] - 2019-05-10
--------------------
##### Fixed
- Analog scale widget without current value box, still firing excessive change events.
- Distress widget mercury is not reset properly.

[5.2.7] - 2019-05-09
--------------------
##### Fixed
- Range, Analog Scale, Datetime, and Time widgets fire an unnecessary change event when a new value is set that is equal to the existing value.
- Range widget fires an unnecessary change event when the value is empty, before the value is set, when the user clicks the widget.
- Issue with datepickers in Grid Theme in Firefox in apps using Enketo Core (Enketo Express) where the reset button is rendered outside the cell.

[5.2.6] - 2019-05-01
--------------------
##### Fixed
- Draw widgets loose drawing (or last stroke(s) in drawing) on mobile devices if clicking hide-full-screen button or switching device orientation within 1.5 sec after last change.

[5.2.4] - 2019-04-25
--------------------
##### Fixed
- Some forms with repeats fail to load in Safari.

[5.2.3] - 2019-04-24
--------------------
##### Fixed
- Failing to clone repeats that only contain calculations.
- Select one calculations not updating correctly.
- Non-relevant calculations inside non-first repeat instances run upon load.
- Range widgets do not work on touchscreen devices.
- Date strings without timezone component are not always converted correctly in timezones that have DST.
- Hand-typed/pasted dates with spaces or invalid characters are kept shown to user, but are not stored in model.

[5.2.2] - 2019-04-01
--------------------
##### Changed
- Hide reset button when question is readonly.

##### Fixed
- Readonly Draw/Signature widget updates with empty file when canvas looses focus.
- Readonly Select Minimal widget is not readonly.
- Readonly File widget becomes writeable if it becomes relevant.

[5.2.1] - 2019-03-26
--------------------
##### Changed
- The restriction on crossing paths in the geoshape widget was removed.

##### Fixed
- Radiobutton unselect functionality can cause infinite loops with certain custom extensions that update values programmatically.

[5.2.0] - 2019-03-19
---------------------
##### Added
- A configurable option to provide a maximum character length of a text field.

##### Fixed
- The output in an itemset option label is not populated upon load.

[5.1.3] - 2019-02-26
---------------------
##### Changed
- Partial rewrite of events.
- Improved accuracy of progress tracker.

##### Fixed
- On touchscreen devices, the draw widget download functionality does not work, and clicking the Draw button empties the canvas.
- XForms using geopoint, geotrace, geoshape, time, date, datetime, select minimal, rank, autocomplete calculations **without form control** (advanced) fail to load.
- Some widgets (such as all geo widgets) do not update view if a calculation changes the underlying value.

[5.1.1] - 2019-02-21
---------------------
##### Fixed
- Calculations using advanced count(/path/to/repeat/node1[text()="something"]) aren't recalculated when a node1 changes.
- Exception occurs when appearance 'horizontal' is added to group (which has no support for this appearance).
- If the window in an online-only multi-page form is resized, while a drawing is on a currently-not-shown page, the submission results in an empty drawing.

[5.1.0] - 2019-02-18
---------------------
##### Changed
- Readonly draw widgets no longer show drawings on grey background in Grid Theme, nor apply an opaqueness filter.
- Repeat deletion with "-" button now requires confirmation.

##### Fixed
- Loading image from record may show error even if it was loaded successfully.
- Generic file upload not working (cannot set property 'src' of null).

[5.0.5] - 2019-02-07
---------------------
##### Fixed
- New repeats are always shown in default language.
- Relative repeat-counts not working.

[5.0.4] - 2019-01-10
---------------------
##### Fixed
- Loading a form with a readonly file input throws an exception.
- Times and datetimes with meridian notation are set to empty in the model for times between 12:00 AM and 1:00 AM, and between 12:00 PM and 1:00 PM.

[5.0.3] - 2019-01-07
--------------------
##### Fixed
- Too much delay in saving drawings/signatures/annotations.
- Slider in vertical range widget not aligned properly in Grid Theme.
- Analog scale widget min/max labels not position properly in Grid Theme.

[5.0.2] - 2019-01-07
--------------------
##### Changed
- Fewer model updates during drawing using draw/signature/annotate widgets (performance).

##### Fixed
- Loading error in Pages mode when a page has no label.
- Itemsets not populating if inside an non-relevant group upon load.
- Download link not working for Draw/Signature/Annotate widgets.
- Broken autocomplete widget in Safari and all iOS browsers.

[5.0.1] - 2018-12-20
--------------------
##### Changed
- Support Document instance for external data.

##### Fixed
- Likert item option labels with unequal number of lines not lined up correctly in Grid Theme.

[5.0.0] - 2018-12-17
--------------------
##### Removed
- Deprecated methods.
-
##### Changed
- Converted to modern Javascript **WARNING: requires new build systems**
- Do not include time component for today().
- Converted to new widget format **WARNING: widgets in the old format are no longer supported**.
- Consistent JS filenames without capitalization and without camelCasing.

##### Fixed
- Default values not loaded in non-first repeat instances.
- Table widget option hover background is not centered around radiobutton/checkbox.
- Date calculations (e.g. today()) for number type questions do not return a number.
- RTL script detection failing with Sorani (Kurdish) and other languages (Enketo Transformer).

[4.60.6] - 2016-10-26
----------------------
##### Fixed
- Does not show select options from external data if form is not translated (Survey123 only).

[4.60.5] - 2018-10-25
----------------------
##### Fixed
- Autocomplete widget not updating when form language is changed.
- Failing to translate select options from external data (Survey123 only).

[4.60.4] - 2018-10-19
----------------------
##### Fixed
- If grid form starts with a disabled question, the first question has no top border.
- If first page in form is non-relevant upon load, it is still shown (in grayscale).
- Minimal select picker (pulldown) not updating model (regression in 4.60.3).

[4.60.3] - 2018-10-16
----------------------
##### Fixed
- Loading records not working in IE11. All node values are emptied when a record is supplied.
- In FF when a radiobutton or checkbox is clicked directly in a pulldown select, the URL fragment identifier is updated (and page scrolls to the top).

[4.60.2] - 2018-10-05
----------------------
##### Fixed
- Timepicker localized AM/PM strings not detected properly in Firefox and Safari.

[4.60.1] - 2018-10-05
----------------------
##### Fixed
- Timepicker meridian field not wide enough for Chinese AM/PM.
- Timepicker meridian detection not working in IE11.
- IE11 polyfill for .after not working on comment nodes.

[4.60.0] - 2018-09-24
----------------------
##### Changed
- Form model was refactored to remove jQuery dependency.

##### Fixed
- Cascading selections with radiobuttons/checkboxes do not show image labels.
- Loading error when record with repeat calculation was loaded and validateContinously was set to `true`.

[4.59.0] - 2018-09-11
----------------------
##### Added
- new `Form.prototype.getModelValue` function and made this available as a widget helper.

##### Changed
- Performance of engine (determining index).
- `FormModel.prototype.getVal` now returns a string. **WARNING: internal API change that may affect custom apps**
- Print hints are now guidance hints, and follow ODK XForms specification.

##### Fixed
- Range pickers not showing current value "thumb" on printouts.
- Distresspicker thumb not centered on Chrome and Safari.
- `jr:choice-name()` function not working with autocomplete questions.
- Language selector not populated in some Enketo-powered applications.

[4.58.0] - 2018-08-28
----------------------
##### Changed
- IE11 support is now enabled differently. See [readme.md](https://github.com/enketo/enketo-core#enabling-support-for-internet-explorer-11). **WARNING**

##### Fixed
- Calculation results inside repeats are shown incorrectly to user under certain conditions.
- When a repeat is removed, calculations inside sibling repeats (e.g. using `position(..)`) are not always re-calculated.

[4.57.2] - 2018-08-24
----------------------
##### Fixed
- Loaded year and month-year values not displayed correctly in date (desktop) widget.

[4.57.1] - 2018-08-23
----------------------
##### Changed
- Provide way to not apply 'empty' class to special readonly views.

##### Fixed
- Appearance "placement-map" not showing map in geowidgets.
- If form in Pages Mode has a repeat as the first page (with field-list), a blank first page is shown.

[4.57.0] - 2018-08-13
----------------------
##### Added
- Table of Contents to Pages mode that enables jumping to any page.

##### Fixed
- Questions with calculations do not re-validate immediately when the value is re-calculated (with `validateContinuously: true`).
- Labels with words longer the form width, overlap with other form elements.
- Readonly questions in newly cloned repeats in Grid Theme do not get the proper readonly styling.
- Whitespace only input triggers a `valuechange.enketo` event but should not.

[4.56.0] - 2018-08-06
----------------------
##### Added
- Enable/disable meridian in timepicker and datetimepicker based upon detected locale preferences.

[4.55.2] - 2018-08-02
----------------------
##### Fixed
- Download links in file input and draw widgets not working in IE11.
- The required asterisks (*) do not update in real-time if `validateContinously` is set to `false`.
- If a required text input field has a non-whitespace value that is replaced by the user to a whitespace-only value the new whitespace-only value is saved and considered valid.

[4.55.1] - 2018-07-25
----------------------
##### Changed
- In Grid Theme readonly questions with value now have the same whole-cell background color as readonly questions without a value.

##### Fixed
- The external data property of the form data instantiation parameter changes to an empty XML Document after adding it to the model. This causes issues in applications that rely on that property to remain immutable.

[4.55.0] - 2018-07-19
----------------------
##### Added
- Support for 'no-ticks' appearance in range widget.

##### Changed
- ODK namespace for `<rank>` widget (in enketo-transformer) to http://www.opendatakit.org/xforms.

##### Fixed
- Range widget in FF, the ticks partially disappear when the widget has a value.
- Randomize() doesn't work for itemsets that use itext() labels (in enketo-transformer)

[4.54.3] - 2018-07-11
---------------------
##### Fixed
- Exceptions thrown with complex jr:choice-name() usage.
- Various Geo Widget styling issues with buttons, mobile (fullscreen) and RTL scripts.

[4.54.2] - 2018-06-27
---------------------
##### Fixed
- Autocomplete question inside a non-first repeat shows list from first repeat.
- Dates are now considered local to fix constraints such as ". < today()"

[4.54.1] - 2018-06-20
---------------------
##### Fixed
- In a form containing a group with a single child repeat (and no other repeat sibling questions), fails to load a record where that group is empty. When creating the first repeat after load an exception occurs.
- Output inside a group that is non-relevant upon loading does not get evaluated when the group becomes relevant.

[4.54.0] - 2018-06-18
---------------------
##### Added
- URL widget

##### Fixed
- When unfolding collapsed groups, the draw widgets are not functional until the window is resized.
- Various styling degradations of geo widgets.

[4.53.0] - 2018-06-15
---------------------
##### Added
- Support for ranking widget

[4.52.4] - 2018-06-12
---------------------
##### Fixed
- Range widget loading error if relevant is used.

[4.52.3] - 2018-06-11
---------------------
##### Fixed
- Readonly text inputs with a default value are hidden.
- Certain XPath function calls without parameters cause an infinite loop.

[4.52.2] - 2018-06-06
---------------------
##### Fixed
- IE11 hack is not focused enough (affecting EE modals).
- Coordinates around the international dateline (longitude < -180 degrees) are considered invalid in geo widgets.

[4.52.1] - 2018-06-04
---------------------
##### Fixed
- Range widget turns geopoint coordinate inputs into rangepickers if initialized after geo widget.

[4.52.0] - 2018-06-04
---------------------
##### Added
- Support to provide external data as XML Document. **Warning: providing an XML string is now considered deprecated usage.**
- Support for range widget (basic).

##### Changed
- Performance-optimized itemsets. Cutting-edge browsers can now deal well with documents containging 16,500 items (!).

[4.51.6] - 2018-05-24
---------------------
##### Changed
- Improved accessibility of buttons and links.

##### Fixed
- Styling interference occurs when an appearance is added to a question type that doesn't support it.

[4.51.5] - 2018-05-23
---------------------
##### Changed
- Facilitate custom apps with different calculation _types_ by making calculation.update overwritable.

[4.51.4] - 2018-05-14
---------------------
##### Fixed
- Appearance "horizontal" enlarges the last option if the remainder of the options modulo 3 is 1.
- If all repeats containing a question that has skip logic are removed, an exception occurs when obtaining the model as string without non-relevant nodes.

[4.51.3] - 2018-05-02
---------------------
##### Fixed
- When a record is loaded with an empty value for a node that has a default value in the XForm, all secondary instance values are emptied.

[4.51.2] - 2018-05-01
---------------------
##### Changed
- Added a hook for Enketo Validate to add custom XPath functions.

[4.51.1] - 2018-04-27
---------------------
##### Changed
- Hide disabled reset button in draw widget.

##### Fixed
- Comment icon overlaps long label in simple select/select1 questions.
- Pasted incorrect date value converts to today's date.

[4.51.0] - 2018-04-25
----------------------
##### Added
- Decimal-time() support.
- Distance() support.

##### Fixed
- In Safari, readonly checkboxes and radiobuttons can still be manipulated and WILL modify the record, even if the UI doesn't update.
- Decimal-date-time() not spec-compliant at all.
- Filepicker and drawing widgets have functional reset button when they are readonly.

[4.50.0] - 2018-04-22
----------------------
##### Added
- Basic randomize() support to shuffle nodesets (no support for itemsets with itext labels).

##### Changed
- GoTo function separated from form.init and should now be called separately with form.goTo(xpath). **WARNING: Update app if GoTo functionality was used.**
- Increased linespacing for labels of "select" questions.

##### Fixed
- Min() and max() ignore non-last arguments/nodes with value 0.
- Goto functionality throws exception if target is a comment question that is not inside a group and the form is in Pages Mode.

[4.49.0] - 2018-04-14
---------------------
##### Removed
- function `printForm` in print script **WARNING: Rewrite function call and use the `print` function as an example**.

##### Fixed
- Add-repeat (+) button not aligned properly in Grid theme when no repeats exist.
- Manual date input without hyphen (i.e. large number) is converted to non-sensible date.

[4.48.1] - 2018-04-06
---------------------
##### Fixed
- Grid theme print script does not size cells with images correctly causing overflow into neighboring cells.

[4.48.0] - 2018-04-03
---------------------
##### Changed
- Annotate widget will now no longer allow drawing until an image has been uploaded.

##### Fixed
- If the form starts with a lengthy group, the print view shows only the form title on the first page.
- Loading drawings from existing records, results in blank canvas after window resizing. **WARNING: Requires adding a getObjectURL function to the file manager module (in case this is overridden your app)**
- The image map widget shows 'SVG not found error' in Firefox sometimes, and if so, it fails to scale the image.

[4.47.6] - 2018-03-23
---------------------
##### Changed
- Print script has been reorganized. **WARNING: If your app is using the print script (for Grid Theme forms), update your code!**

##### Fixed
- Print view of Grid Theme form in Pages mode doesn't properly stretch cells in the current page.
- Print script for Grid Theme doesn't have a default for paper format and doesn't apply user-defined margin.
- Markdown headers in Grid Theme are overlapping in print view.
- Print script for Grid Theme doesn't correct width of last question in form.

[4.47.5] - 2018-03-21
---------------------
##### Changed
- Positioning of comment widget icon next to question label.
- Center media inside labels.

[4.47.4] - 2018-03-14
---------------------
##### Changed
- Enketo Transformer: In Markdown, make a distinction between paragraphs (2+ subsequent new lines) and simple new lines.

##### Fixed:
- Image Map widget inside repeat sometimes shows 'SVG image cannot be loaded' message when all is okay.
- Enketo Transformer: In Markdown, newline characters are not converted if they follow a heading.

[4.47.3] - 2018-03-09
---------------------
##### Fixed:
- If existing drawing/signature/annotion is loaded from a http URL, an exception occurs.
- When radiobutton or checkbox is cleared programmatically the `data-checked` attribute is not updated.
- Filenames of signature, annotation and drawing inputs are set to undefined-xx.png.

[4.47.2] - 2018-03-02
---------------------
##### Removed:
- File upload "no preview for this file type" message.

##### Fixed
- Cursor in Grid theme set to text for no seemingly good reason.
- Markdown headers not limited from h1-h6 as they should be (in Enketo Transformer)

[4.47.1] - 2018-02-27
---------------------
##### Changed
- Show separate custom reset messages for drawing, signature and annotation widgets.

##### Fixed
- Date format shown to user in readonly field is different from non-readonly field.
- Autocomplete widget does not accept options that have multiple subsequent spaces in their label.
- Draw widget draw color gets reset to the default color after undo-ing strokes.

[4.47.0] - 2018-02-21
---------------------
##### Added
- Download functionality to draw widgets.
- Support for "new", "new-front", "new-rear" on media inputs.
- Feature to undo drawing strokes in draw and annotate widgets.

##### Changed
- Show helpful error message if SVG image cannot be found with Image Map widget.
- Native month-year datepicker used on mobile devices when available.

##### Fixed
- In annotate widget loaded file disappears when screen is resized.
- Annotate widget not working on touchscreen devices.
- Annotate widget stretches uploaded image.
- Downloaded drawings have a different filename from the one stored in the record.
- Imagemap widget does not work for a group `<g>` of `<path>`s.
- Imagemap scaling issue when width and height defined in SVG file have units (pt).

[4.46.0] - 2018-02-14
---------------------
##### Added
- Full support for annotate widget.

##### Changed
- Draw/signature widget requires confirmation before reset.
- Modal dialogs can now be overridden in app
- Renamed 'enketo-config', 'translator', '../path/to/file-manager', and 'widgets' modules to 'enketo/config', 'enketo/translator', 'enketo/file-manager', 'enketo/widgets'. **WARNING: update overrides for these modules in your app!**

##### Fixed
- Printing: geo widget with appearance "maps" does not show coordinate fields.

[4.45.0] - 2018-02-08
---------------------
##### Added
- File pickers can now (only) be reset by reset button.
- Download functionality to file pickers.

##### Changed
- If repeat is completely empty it no longer takes up any visual space.
- Show upload placeholder with max file size.
- Error messages in geopicker are now translatable.

[4.44.4] - 2018-01-31
---------------------
##### Fixed
- Instances with special characters in instance id attributes fail to be queried.
- Namespaces not resolved for secondary instances.

[4.44.3] - 2018-01-30
---------------------
##### Fixed
- Instance('id' )/path/to/node does not work if 'id' is surrounded by whitespace.
- (In Enketo Transformer) Markdown headers preceded by whitespace fail to render as header and whitespace trimming is to aggresive.
- Datepicker with "month-year" and "year" appearance shows full value.

[4.44.2] - 2018-01-23
---------------------
##### Changed
- Upgraded to jQuery 3.3.x. **Warning: Likely requires the app that uses enketo-core to also upgrade to jQuery 3.3.x!**

##### Fixed
- Date strings returned by XPath evaluator for question with type 'date' are not considered valid dates and set to ''.

[4.44.1] - 2018-01-18
---------------------
##### Changed
- Reduced margins around markdown headers.
- (In Enketo Transformer) better markdown headers with escaping and inline hashtag use.

##### Fixed
- A top-level group with a relevant that refers to a node inside a repeat may not get re-evaluated when the node changes and multiple repeats exist.
- Editing a record with an empty group fails miserably.

[4.44.0] - 2018-01-16
---------------------
##### Added
- Option to turn off page-swipe support.

##### Fixed
- An output inside a group label that is the parent of a repeat with 0 instances, causes a loading exception.
- (In Enketo Transformer) Readonly question does not show constraint message.

[4.43.0] - 2018-01-05
---------------------
##### Changed
- Invalid dates (and datetimes) such as 2018-12-35 are no longer automically converted to a valid date. They convert to empty now.

##### Fixed
- Repeat with field-list and parent group with field-list does not show "+" button and both groups fail to collapse.
- Printing: datetime picker inputs print below each other in Chrome.
- Safari invalidates any valid date (and datetime) with segments < 10, e.g. 2018-01-06.

[4.42.3] - 2017-12-29
---------------------
##### Changed
- Modest performance improvement with large repeat counts.

##### Fixed
- The IE11 (optional) workaround for checkboxes/radiobuttons does not work when a table has image labels.
- RTL scripts not supported for the (optional) IE11 radiobutton/checkbox workaround.
- RTL scripts do not have centered checkboxes/radiobuttons in tables.
- If preload item is placed inside a repeat with a repeat-count of 0, an exception occurs.
- RTL scripts with Grid Theme have mislocated repeat numbers and repeat removal button.

[4.42.2] - 2017-12-28
---------------------
##### Changed
- Added optional workarounds for IE11 to match regular checkbox and radiobutton styling.

##### Fixed
- Group collapse icon overlaps border on small screens.
- Black background shown behind radiobuttons and checkboxes on iOS browsers.

[4.42.1] - 2017-12-25
---------------------
##### Changed
- Image scaling by Image Map widget is more sensitive to screen size to avoid scrolling.

##### Fixed
- The advertised required transformer version fails to build on Windows 10.
- In Signature/Draw widget a line can be detected as a page-swipe in Pages mode.
- If Signature/Draw widget has loaded an existing value and is not on the first page, the drawing won't be shown until clicked.
- If SVG image in Image Map widget contains inline `style` attribute with fill and stroke the 'selected' state is not shown.

[4.42.0] - 2017-12-22
---------------------
##### Changed
- Error messages in filepicker are now translatable.
- Start development server with `npm start`.
- Firefox checkboxes now styled properly. **WARNING: Make sure to [update your css build task](https://github.com/enketo/enketo-core/commit/9575559c015514dcec1942c30582a52bafb149f7)!**

##### Fixed
- jr:choicename() is causing an exception when wrapped inside other functions.
- Workaround for an XLSForm limitation by moving "no-collapse" appearance of repeat to its parent group.

[4.41.9] - 2017-12-20
---------------------
##### Fixed
- Npm refuses to install previous version with enketo-xslt 1.15.2, since December 19th 2017 or before.

[4.41.8] - 2017-12-19
---------------------
##### Changed
- When clicking the label of an upload question, the filepicker will no longer launch.

##### Fixed
- Datepicker not available on iOS browsers (again, sorry).

[4.41.7] - 2017-12-11
---------------------
##### Fixed
- Printing: Non-relevant non-select fields are not greyed out.
- Printing: Geo widget without "maps" appearance is shown on screen but not on printout.
- Printing: Geo widget map/zoom selector buttons are shown on printouts.
- Printing: Various Analog Scale widget styling issues.
- Grid Theme: A table-list/list-no-label question does not have a bottom border.
- Grid Theme: Top of page sometimes does not have a border.
- jr:choice-name() function can not handle syntax with more complex XPaths.
- Nodenames with dots cause an exception during extraction of a serialized model without non-relevant nodes.

[4.41.6] - 2017-11-29
---------------------
##### Fixed
- When a repeat is removed any logic that depends on repeat position changes is not updated when it should be.
- Printing: only first page printed in Firefox.
- Printing: group collapse carets shown.
- Printing: number input up/down buttons shown in Firefox.
- Repeat with relevants and parent group without `ref` attribute is not revealed when relevant becomes true.
- In pages mode, text and number inputs can no longer get focus.
- Printing: select-one does not show all options in long lists.
- Printing: styling improvements for draw/distress/likert widgets.

[4.41.5] - 2017-11-24
---------------------
##### Fixed
- Draw/signature widget not working in pages mode sometimes, if it is not on the first page.

[4.41.4] - 2017-11-16
---------------------
##### Changed
- Visually separate repeat instances in Grid Theme.

##### Fixed
- A new repeat with a date field that is not relevant by default does not get the date widget on non-touchscreen devices.

[4.41.3] - 2017-11-13
---------------------
##### Changed
- Styling of repeat + button in Grid Theme.

##### Fixed
- Various issues with repeat + button in Pages Mode when repeat=page.
- Excessive change events fired by datepicker, timepicker, and datetimepicker when reset button is clicked when value is empty.

[4.41.2] - 2017-11-08
---------------------
##### Changed
- More customization options of the file manager module.

##### Fixed
- A calculated item (without form control) and with a relevant inside a repeat throws an exception when there are 0 repeats and the relevant is evaluated.

[4.41.1] - 2017-10-27
---------------------
##### Fixed
- If repeat = page in Pages mode, the second+ repeat is now shown.

[4.41.0] - 2017-10-18
---------------------
##### Changed
- Time format according to ODK XForms Specification (10:12 -> 10:12.00.000-06:00). **WARNING: Make sure your backend is ready for this.**

[4.40.0] - 2017-10-16
---------------------
##### Added
- Make all label groups collapsible.
- Let appearance "compact" on a group collapse this group by default.
- Make first repeat removable with button if repeat-count is not used.
- Let appearance "minimal" on a repeat prevent automatic creation of the first repeat instance.

#### Fixed
- Data type conversion issues for integers and dates.

[4.39.5] - 2017-10-09
----------------------
##### Fixed
- Datepicker not available on iOS browsers.
- In nested repeats a user-entered repeat count is always taken from the first repeat if current repeat instances in the series are zero.

[4.39.4] - 2017-10-06
----------------------
##### Fixed
- Max() and min() fail if nodeset is empty (0 repeats).
- If first page is not relevant it is still displayed upon load.

[4.39.3] - 2017-10-03
----------------------
##### Fixed
- CSS build issue with Grid Theme.
- With validateContinuously=true, a new repeat instance should not be evaluated as soon as it is created.
- Pesky "error" message that sourcemap for bootstrap-datepicker.css is not found (when dev tools are open in browser).

[4.39.2] - 2017-09-26
----------------------
##### Fixed
- Readonly fields with calculation are not cleared in model when they become non-relevant if clearIrrelevantImmediately is set to `true`.
- Calculated items without form control were calculated even if they were inside an non-relevant group.
- Radiobuttons inside a repeat are sometimes incorrectly removed from the submission.

[4.39.1] - 2017-09-13
----------------------
##### Fixed
- Form loading error with new decimal input mask.

[4.39.0] - 2017-09-06
----------------------
##### Added
- Support for appearance="numbers" on text inputs.
- Fixed input masks for integer and decimal inputs.

##### Changed
- Make goto-target-not-found error translatable.

[4.38.2] - 2017-08-17
----------------------
##### Fixed
- In some occasions, nested repeat nodes that are relevant are removed from the record string as if they were non-relevant.
- In tables, the heading row (appearance=label) can be misaligned with the lower rows.
- Cloned select minimal question with relevant inside repeat is hidden when loading record with multiple repeats.
- Draw/signature widget is instantiated for file input types other than "image".
- Draw/signature widget is never enabled if it has a relevant expression.
- File inputs do not always clear properly when they become non-relevant.

[4.38.1] - 2017-08-10
---------------------
##### Fixed
- Manual date edits do not get propagated to model if Enter key is not pressed.
- When loading record with repeats, any select/select1 questions (without appearance "minimal") in non-first repeats are not initialized properly.
- Comment icon and required asterisk overlapping with each other and with label in Grid theme.
- Timepicker styling issues in Grid theme.

[4.38.0] - 2017-08-03
---------------------
##### Added
- Draw/signature widget.

[4.37.0] - 2017-07-25
---------------------
##### Added
- Ability to hide non-relevant questions from printout (now the default) with a setting.

##### Changed
- Touchscreen detection to change widgets and appearance has been tweaked and is now only considering iOS and Android browsers.
- Native date inputs (touchscreen or readonly) do not show 'yyyy-mm-dd' placeholder text anymore when empty and unfocused,

[4.36.2] - 2017-07-21
---------------------
##### Changed
- Made branch module more extensible.

##### Fixed
- A readonly select minimal (desktop) widget becomes editable when it has a "relevant" expression that evaluates to true.

[4.36.1] - 2017-07-05
---------------------
##### Fixed
- Emergency temporary workaround for checked state of checkbox in Firefox.
- Error message when removing non-relevant nodes because the node cannot be found.

[4.36.0] - 2017-07-03
---------------------
##### Added
- "no-text-transform" style to be used with Grid Theme to prevent uppercasing labels.

##### Fixed
- Readonly select minimal on touchscreens is not properly readonly.

[4.35.4] - 2017-06-20
---------------------
##### Changed
- Updated datepicker module.

##### Fixed
- Duplicate logic evaluation when a repeat is added.

[4.35.3] - 2017-06-19
---------------------
##### Changed
- Reduced swipe sensitivity to avoid accidental "click-swiping" with a mouse.

##### Fixed
- Page swipe bypasses block-page-navigation-on-new-constraint-error feature.
- If form in Pages mode has only one page, this page is not shown.

[4.35.2] - 2017-06-13
---------------------
##### Fixed
- Datetime and date widgets do not update with calculated date when they are not readonly.

[4.35.1] - 2017-06-09
---------------------
##### Changed
- Add loadError if "go to" field cannot be found.
- Fire "gotohidden.enketo" event if "go to" field is hidden.

##### Fixed
- Frozen UI if "go to" field is a comment field whose linked question is hidden.

[4.35.0] - 2017-05-26
---------------------
##### Added
- Count-non-empty() support.

##### Changed
- Localize %a and $b in format-date() to form locale at time of calculation.

[4.34.1] - 2017-05-25
---------------------
##### Fixed
- Timepicker and Datetimepicker issues around empty and default values.
- When loading a record with nested repeats the second+ series gets inserted out-of-order in the model.
- When loading a record with nested repeats and additional nested groups, the nested repeats are not cloned in the view.

[4.34.0] - 2017-05-22
---------------------
##### Added
- Ability to jump to specific question upon load. Read more [here](https://github.com/enketo/enketo-core#go-to-specific-question-upon-load).

[4.33.1] - 2017-05-18
---------------------
##### Fixed
- Branches and Outputs not initialized when repeat is cloned.

[4.33.0] - 2017-05-17
---------------------
##### Added
- Image Map select widget.

##### Fixed
- Itemsets inside a repeat with a choice_filter (predicate) dependency outside the repeat are not initialized when repeat is cloned.

[4.32.1] - 2017-05-09
---------------------
##### Fixed
- Dataupdate event does not include correct repeatPath and repeatIndex properties (fix may significantly improve performance of forms with repeats).

[4.32.0] - 2017-05-05
---------------------
##### Added
- Support for appearance 'hide-input' in ArcGIS geo widget.

[4.31.4] - 2017-05-03
---------------------
##### Fixed
- Exception occurs when obtaining cleaned-of-non-relevants model string if repeat has a relevant and a repeat-count of 0.

[4.31.3] - 2017-05-01
---------------------
##### Fixed
- Exception occurs when using form.pathToAbsolute inside a widget.

[4.31.2] - 2017-04-28
---------------------
##### Changed
- ArcGIS API for JS updated to 4.3 in ArcGIS geo widget.

##### Fixed
- IE11 exception upon loading forms with repeat templates.
- Progress status calculation not excluding comment questions.

[4.31.1] - 2017-04-27
---------------------
##### Changed
- Always lock scrolling of ArcGIS geo widget until user clicks the map (previously only on touchscreens).

##### Fixed
- Selectpicker (non-touch) does not show checked status if radiobuttons/checkboxes themselves are clicked.

[4.31.0] - 2017-04-26
---------------------
##### Removed
- "validated.enketo" event.
- Subtle "required" text on focus.

##### Added
- Ends-with() and abs() XPath support.

##### Changed
- If validatePage is set to `false`, block page navigation for some milliseconds if required to ensure that user sees new error message.

##### Fixed
- XPath int() conversion incorrect for negative values.
- A repeat with a relevant and a repeat-count of 0, throws exception upon load.

[4.30.0] - 2017-04-21
---------------------
##### Removed
- AMD remnants (was already incompatible). **WARNING: use 'enketo-config' instead of 'text!enketo-config' now.**

##### Added
- Ability to customize everything.

[4.29.2] - 2017-04-14
---------------------
##### Fixed
- Repeats no longer shown on separate page in pages mode when they have field-list appearance.
- Loading values into first radiobutton or first checkbox fails to update UI.

[4.29.1] - 2017-04-13
---------------------
##### Fixed
- Empty repeat count is ignored but should be considered as zero.

[4.29.0] - 2017-04-12
---------------------
##### Changed
- Hide required “*” when dynamic required expression evaluating to false at the time the input field is validated.
- First repeat in a series has become removable when repeat-count is zero.

[4.28.0] - 2017-03-30
---------------------
##### Added
- Method to obtain primary instance without non-relevant nodes.

##### Fixed
- In pages mode, if page (group) is relevant but only includes non-relevant questions, it is displayed as an empty page.
- Inputupdate.enketo event fires even if value hasn't changed.

[4.27.2] - 2017-03-23
---------------------
##### Fixed
- Autocomplete widget causes exception when branch is hidden or revealed (due to relevant expression).

[4.27.1] - 2017-03-22
---------------------
##### Changed
- Label of readonly question with a calculate expression is styled as regular question.
- Input field of readonly question with a calculate expression is now always visible to user.

##### Fixed
- ArcGIS geopicker fails to initialize inside a repeat.
- Value not cleared from widget UI when it becomes non-relevant and clearIrrelevantImmediately is set to `true`.

[4.27.0] - 2017-03-20
---------------------
##### Changed
- Reduced vertical whitespace between label and radiobuttons/checkboxes.

##### Added
- Safari and iOS browser support for autocomplete widget.
- Ability to disable page validation (default is unchanged).

[4.26.2] - 2017-03-16
---------------------
##### Fixed
- Exception occurs when forms contains no textarea (multiline text widget).
- Repeat count updates in pages mode causes unhelpful page flipping behaviour if the repeat has _field-list_ appearance.
- Negative decimal numbers not converted correctly to integers.

[4.26.1] - 2017-03-10
---------------------
##### Fixed
- Styling issues with readonly questions.
- Grid theme does not print complete textarea if text requires scrolling.

[4.26.0] - 2017-03-09
---------------------
##### Added
- Ability to add custom data to dataupdate event.

[4.25.0] - 2017-03-07
---------------------
##### Added
- Ability to pass session properties (metadata) when instantiating form.
- Exp10() and log() functions.

[4.24.2] - 2017-03-03
---------------------
##### Fixed
- XPath number results not converted to date and datetime when stored.

[4.24.1] - 2017-03-02
---------------------
##### Fixed
- Widgets in cloned repeats not re-initialized.

[4.24.0] - 2017-03-02
---------------------
##### Added
- Support for truly dynamic repeat count (jr:count attribute).

##### Fixed
- Select desktop picker options cannot be selected by pressing spacebar.
- Accessibility issue with file input picker (tab traversal, focus).

[4.23.0] - 2017-03-01
---------------------
##### Added
- Autocomplete widget for all browser except: Safari and all browsers on iOS.

[4.22.2] - 2017-02-23
---------------------
##### Fixed
- jr:choice-name() inside a repeat produces incorrect results.
- Media labels in itemsets are not shown.

[4.22.1] - 2017-02-21
---------------------
##### Fixed
- Incomplete type conversion of int, decimal, time, date and datetime.
- Calculation with relevant on readonly field inside repeat not evaluated when it should be.

[4.22.0] - 2017-02-17
---------------------
##### Added
- Support for lang attributes on choice labels in secondary instances.

[4.21.0] - 2017-02-10
---------------------
##### Added
- A validateContinuously mode.
- Send _validated.enketo_ and _invalidated.enketo_ events with extensible/custom data.

[4.20.0] - 2017-02-03
---------------------
##### Changed
- Date, time and datetime pickers on non-touch screens now allow manual input as well.

##### Fixed
- Accessiblity issues with radiobuttons, checkboxes, likert, compact.

[4.19.0] - 2017-01-24
---------------------
##### Changed
- Sass build now working out-of-box with npm 3.x and npm 4.x. **Warning: check the sass build config in your app. You may need to simplify it and/or upgrade npm.**

[4.18.0] - 2017-01-18
---------------------
##### Changed
- Valuechange.enketo event now fires *after* validation and passes a boolean representing the combined validation result.

##### Fixed
- Horizontal analog scale label and slider overlap on small screens.

[4.17.3] - 2017-01-05
---------------------
##### Fixed
- Subtle ‘required’ message remains visible for empty questions with dynamic required expressions that evaluate to false().
- When question has a comment widget and is in an invalid state, this state is not removed when the comment value changes and makes the question valid.

[4.17.2] - 2016-12-23
---------------------
##### Changed
- No longer need to call function `clearIrrelevant`. The form.validate() call will automatically clear them.

[4.17.1] - 2016-12-22
---------------------
##### Fixed
- Enketo transformer version in getRequiredTransformerVersion not up to date.

[4.17.0] - 2016-12-22
---------------------
##### Added
- Static method to obtain required enketo-transformer version (Form.getRequiredTransformerVersion).
- Option to let engine keep non-relevant values until new function `clearIrrelevant` is called.

##### Fixed
- Various issues with grunt that made it harder to start developing on enketo-core.

[4.16.2] - 2016-12-14
---------------------
##### Fixed
- Comment widget in pages mode without field-list has hidden comment field and shows empty page.
- Repeat position injection gets confused if there is sibling of a repeat whose nodename is equal to the start of the repeat nodename.

[4.16.1] - 2016-12-05
---------------------
##### Fixed
- Label of comment widget not shown when used with an analog-scale question.
- Entire label of complex (geo, analog scale) widget triggers comment button click.
- Comment icon not displayed inline after non-block label of analog-scale widget.
- Esri/ArcGIS geopicker does not re-instantiate in a cloned repeat.

[4.16.0] - 2016-11-30
---------------------
##### Added
- Support for preload attributes on nodes that have a form control. **Warning: All preload items now require enketo-transformer 1.12.0+!**

##### Removed
- select-desktop-bootstrap picker

##### Changed
- readonly styling of: likert widget, compact picker, dates, datetimes, and others.

##### Fixed
- User is able to manipulate readonly widgets: distresspicker, analog-scale-picker, select-desktop-picker, filepickers, geopicker.
- Calculations do not update: analog-scale-picker, distresspicker, mobile regular select, mobile multiselect picker preview, timepicker, geopicker, esri-geopicker.
- XPath calculation returing a datetime string for an XML node with type time is not converted, resulting in an invalid time.
- Geo widget on touchscreens does not hide Google Maps layer when exiting map view

[4.15.1] - 2016-11-09
----------------------
##### Fixed
- Failing css build

[4.15.0] - 2016-11-08
----------------------
##### Added
- Multiple basemaps with toggle button.

[4.14.0] - 2016-11-04
---------------------
##### Added
- UTM coordinate option to Esri/ArcGIS geo(point)picker.
- Auto-record current coordinates in Esri/ArcGIS geo(point)picker.
- Ability to easily test UI in right-to-left script.

##### Changed
- Styling of Esri/ArcGIS geo(point)picker.

##### Fixed
- No error shown when setting coordinates that are outside of Earth's boundaries in the Esri/ArcGIS geo(point)picker. Picker reaches unrecoverable map state.
- Min() and max() get stuck in infinite loop when called with multiple nodeset arguments.

[4.13.1] - 2016-10-31
---------------------
##### Fixed
- Repeat names with dots do not create multiple repeats upon loading and do not default values except for the first repeat.
- Public form.validate() function is skipping constraint validation if xml type is string, binary, select or select1.

[4.13.0] - 2016-10-27
---------------------
##### Changed
- options parameter of Form class changed from `{webMapId: string}` to `{arcGis: {webMapId: string, hasZ: true}}`

##### Fixed
- Empty string literals ('""') are evaluated to 'undefined'.
- MS Edge does not properly clone repeats.
- "Different Encoding" error if instance encoding is specified, even if it's compatible.

[4.12.2] - 2016-10-20
---------------------
##### Changed
- Added "win32" as supported OS to not block enketo-core's installation as dependency on Windows systems.

##### Fixed
- iOS 9 browsers have too much whitespace in formheader in Pages mode on small screens.

[4.12.1] - 2016-10-18
---------------------
##### Fixed
- If repeat has no template, duplicate and conflicting ordinal attributes are added.
- Loading a record with namespaced attributes utterly fails in IE11.
- When record contains text nodes as siblings of repeats, new repeats are not added in correct position.

[4.12.0] - 2016-10-17
---------------------
##### Added
- Initial version of Esri/ArcGIS geopicker (geopoint only). See [README.md](https://github.com/enketo/enketo-core/blob/master/src/widget/geo-esri/README.md.

[4.11.0] - 2016-10-13
---------------------
##### Changed
- Form header now resizing according to its content. **Warning: Check your formheader styling.**

##### Fixed
- Exception 'Cannot ready property "readonly" occurs when branch is disabled.

[4.10.2] - 2016-10-12
---------------------
##### Changed
- Reduced whitespace in form footer across all forms.

[4.10.1] - 2016-10-11
--------------------
##### Changed
- Reduce whitespace in form header and form footer in Pages mode.

##### Fixed
- Various styling issues with the geo picker with `maps` appearance in RTL languages on touchscreens.


[4.10.0] - 2016-10-05
--------------------
##### Changed
- Upgraded to jQuery 3.1.x. **Warning: Likely requires the app that uses enketo-core to also upgrade to jQuery 3.1.x!**

##### Fixed
- Widgets not disabled when they become non-relevant.

[4.9.3] - 2016-09-29
--------------------
##### Fixed
- XPath functions that contain '' or "" are sometimes evaluated incorrectly.

[4.9.2] - 2016-09-26
--------------------
##### Fixed
- Int() XPath function provides incorrect results for very small and very large numbers.
- Fails to build with official grunt-sass.

[4.9.1] - 2016-09-16
--------------------
##### Fixed
- IE11 adds rogue namespaces to ordinal attributes.

[4.9.0] - 2016-08-29
--------------------
##### Added
- Ability to listen for dataupdate events on model before model is initialized
- Optional ability to add repeat ordinal attributes to model in enketo namespace
- Improved extensibility by adding more information to the dataupdate event

##### Changed
- Validation logic refactored and behaviour for required field validation sligthly changed. If a required has a value and is then emptied, the background will turn red.

##### Removed
- Workaround for [ODK Aggregate bug](https://github.com/opendatakit/opendatakit/issues/1116) because it doesn't really solve anything.

##### Fixed
- Fragile namespace handling in model.

[4.8.4] - 2016-08-15
--------------------
##### Changed
- Added workaround option for [ODK Aggregate bug](https://github.com/opendatakit/opendatakit/issues/1116) with NaN, Infity, -Infinity

[4.8.3] - 2016-08-10
--------------------
##### Fixed
- Compact appearances hide text label even if media label is absent.

[4.8.2] - 2016-07-27
--------------------
##### Fixed
- If record-to-edit contains a repeat node with a "template" attribute, repeat behaviour breaks in multiple ways.
- Slow performance of pulldata() for large documents.

[4.8.1] - 2016-07-19
--------------------
##### Fixed
- String values are trimmed before added to model.
- Comment widget scrolling and button hover behavior.

[4.8.0] - 2016-07-11
---------------------
##### Fixed
- Integer and decimal type values convert 'NaN' to '' (reverted ODK Aggregate bug workaround).

[4.7.11] - 2016-06-10
---------------------
##### Fixed
- In IE11, external data cannot be added to model.
- If instanceID node is missing, no error is output to user.

[4.7.10] - 2016-06-08
---------------------
##### Changed
- Comment widget now shown below linked question.
- Comment widget automatically focuses on comment input.

[4.7.9] - 2016-06-01
---------------------
##### Added
- Widgets have access to model's evaluate function.

[4.7.8] - 2016-05-26
---------------------
##### Fixed
- IE11 Record loading "Interface not supported" error.
- IE11 Namespace errors when non-native XPath evaluator is used for namespaced nodes.
- Comment widget styling issues.
- Repeat buttons crossing border in Grid Theme.

[4.7.7] - 2016-05-20
---------------------
##### Changed
- Comment widget styling.
- Now requiring Update button click to store comment.

##### Fixed
- Readonly select questions still selectable.

[4.7.6] - 2016-05-17
---------------------
##### Fixed
- Extreme form loading performance degradation if XForm model is very large.

[4.7.5] - 2016-05-13
---------------------
##### Changed
- Added close x button to comment widget

##### Fixed
- If comment is required/invalid there is no error indication.

[4.7.4] - 2016-05-09
---------------------
##### Fixed
- Styling issues with labels containing # markup, especially in Grid theme.

[4.7.3] - 2016-05-07
---------------------
##### Changed
- Styling of notes (readonly questions).

##### Fixed
- String literals not excluded from /model/instance[1] injection.

[4.7.2] - 2016-05-06
---------------------
##### Fixed
- Comment widget vertical ordering incorrect in Grid theme.

[4.7.1] - 2016-05-05
---------------------
##### Fixed
- Grunt sass build failure.

[4.7.0] - 2016-05-04
---------------------
##### Added
- Proper namespace support. **Warning: Requires enketo-transformer 1.8.0+ or enketo-xslt 1.3.0+**
- Comment widget.

[4.6.0] - 2016-04-26
---------------------
##### Added
- 11 XPath math functions.

[4.5.14] - 2016-04-14
---------------------
##### Changed
- Prepare for ability to change order of radiobutton/checkbox options using CSS 'border' property.

##### Fixed
- Number inputs in Grid Theme not printing
- Value of distress widget not easily visible when printing.
- Select element on mobile not showing first value in virgin state (e.g. when creating a repeat).

[4.5.13] - 2016-04-01
---------------------
##### Changed
- Select minimal widget is now scrollable and won't stretch form.

##### Fixed
- Itemset update not retaining existing values when appropriate.

[4.5.12] - 2016-03-28
---------------------
##### Changed
- Wider select minimal widget in all themes. Full 100% of cell in Grid theme.
- Always show value in select minimal widget when only a single value is selected.

##### Fixed
- Radio buttons and checkboxes not properly aligned vertically.
- Select minimal widget not aligned properly in RTL language.

[4.5.11] - 2016-03-24
---------------------
##### Fixed
- Values in cloned repeat without jr:template are not emptied.

[4.5.10] - 2016-03-18
--------------------
##### Added
- Ability to extract version, action and method attributes (minor).

##### Fixed
- Single-page form in pages mode throws exception and has no submit button.

[4.5.9] - 2016-03-09
--------------------
##### Fixed
- RTL form language right-aligns map layer options.

[4.5.8] - 2016-03-08
--------------------
##### Changed
- All default map layers now obtained via https.

##### Fixed
- Subtle "required" message not translatable.

[4.5.7] - 2016-03-04
--------------------
##### Added
- Ability to maintain a cache of base64-encoded blobs outside of enketo-core.

##### Changed
- Powered by Enketo requirement.

[4.5.6] - 2016-02-26
--------------------
##### Added
- Make form UI strings translatable.

##### Changed
- Font size for bold text in Grid theme now back to what it was (smaller).

##### Fixed
- Select pulldown options are underlined.
- Group headings are left-aligned in RTL languages.

[4.5.5] - 2016-02-10
--------------------
##### Fixed
- Form scrolls to first question upon form load.
- Default values that are set to "" in record, re-appear when record is loaded.

[4.5.4] - 2016-02-09
--------------------
##### Changed
- Form section headers are now left-aligned again.

##### Fixed
- In pages mode, adding a repeat to the current page scrolls to top of page.
- Constraint is evaluated twice when form value is changed.

[4.5.3] - 2016-02-02
--------------------
##### Fixed
- Min() and max() functions did not deal with empty values correctly.

[4.5.2] - 2016-01-14
--------------------
##### Fixed
- jQuery conflict (in Enketo Express), reverted to jQuery 2.1.4

[4.5.1] - 2016-01-13
--------------------
##### Fixed
- Incompatible namespace added by an ODK Collect submission causes a namespace error when loaded.

[4.5.0] - 2016-01-12
--------------------
##### Changed
- ** Now requires enketo-xslt v1.2.5 **

##### Added
- Support for dynamic _required_ expressions.
- Basic support for big-image form attributes on itext values.

##### Fixed
- Existing XForm content of secondary external instance not properly clear if nodename is not 'root' or if multiple root-level nodes are present.

[4.4.6] - 2015-12-31
--------------------
##### Fixed
- Files from iOS camera app overwrite each other if in the same record because filenames are the same.

[4.4.5] - 2015-12-22
--------------------
##### Changed
- Styling of links and styling of **strong** sections of a question label

##### Fixed
- Dependent calculation results upon form load differ based on `<bind>` ordering.

[4.4.4] - 2015-12-03
--------------------
##### Fixed
- Incorrect margins of form footer.

[4.4.3] - 2015-11-24
--------------------
##### Added
- Ability to obtain deprecatedID from model.

[4.4.2] - 2015-11-13
--------------------
##### Fixed
- Current() does not switch context instance for relative paths in an XPath predicate.

[4.4.1] - 2015-11-03
--------------------
##### Fixed
- Fixed icons in timepicker.

[4.4.0] - 2015-10-14
--------------------
##### Added
- In pages mode, the current page will be validated and needs to pass before going to the Next page.

##### Changed
- Analog scale picker reset button disabled when value is empty.
- Analog scale picker reset button hidden when disabled.
- Analog scale picker handle hidden when value is empty.

##### Fixed
- In pages mode, if the page contains a single question, this question does not get focus.
- In pages mode, when the form is inside a scrollable container, it doesn't scroll to first question.

[4.3.0] - 2015-10-08
--------------------
##### Changed
- validate() now returns a Promise (**Warning!**)

[4.2.0] - 2015-10-05
--------------------
##### Added
- Ability to extend data types.
- Analog Scale picker.

##### Changed
- Moved required * to top left of label.

#### Fixed
- In pages mode, page not stretching to at least bottom of window.

[4.1.1] - 2015-09-08
--------------------
##### Added
- Styling support for markdown headings.

##### Removed
- Markdown transformation support moved to enketo-transformer 1.5.0+ (and much more comprehensive)

[4.1.0] - 2015-09-05
--------------------
##### Added
- Support for pulldata function if external data is referenced in XForm instance.

##### Fixed
- Output loading error if external instance is referenced in XPath but does not exist in the model.

[4.0.2] - 2015-09-04
--------------------
##### Added
- Facilitate easy XPath evaluator override.

##### Fixed
- initialization issue on Android webview.

[4.0.1] - 2015-08-27
--------------------
##### Fixed
- datepicker and timepicker css only included as reference in compiled stylesheet.

[4.0.0] - 2015-08-26
--------------------
##### Changed
- Switched to CommonJS modules

[3.8.5] - 2015-08-26
------------------------
##### Fixed
- Repeat buttons missing in Grid theme.
- Pulldowns get cut off when they extend beyond form border.
- Formfooter buttons in pages mode overlap form border.

[3.8.4] - 2015-08-13
------------------------
##### Changed
- Reduce space between border and form on small screens.

##### Fixed
- Loading a record with multiple repeats with missing nodes fails with error message.
- Select minimal widgets in Grid theme overlap other text in print view.

[3.8.3] - 2015-08-05
------------------------
##### Changed
- Repeat background color in Grid theme.

##### Fixed
- Repeat button location in Grid theme.
- Radio buttons inside cloned repeat, require 2 clicks if the master was selected.
- Radio button and checkbox default values not populated correctly in cloned repeat. Overriding values in first repeat.
- Indexed-repeat() result incorrect if expression is inside 2+ repeat.
- Webform not responsive when used in full-size iframe.

[3.8.2] - 2015-07-30
------------------------
##### Fixed
- In pages mode, an exception occurs after submission showing empty page.
- In pulldown select radiobuttons/checkboxes not aligned properly.

[3.8.1] - 2015-07-29
------------------------
##### Fixed
- Page navigation buttons messed up on small screen in pages-mode.
- Top-level (non-grouped) questions on first row do not have a top border.
- Language options in form language selector oddly aligned when mix of rtl and ltr languages is used (FF).
- Title directionality is not displayed according to script used in Grid theme.

[3.8.0] - 2015-07-28
------------------------
##### Added
- Appearance "compact-n" support for media grid pickers.

##### Changed
- Made page swipe less sensitive in pages-mode.

##### Fixed
- Indexed-repeat() expressions not working if the position is dynamic.

[3.7.0] - 2015-07-24
------------------------
##### Added
- Right-to-left script directionality support.

[3.6.2] - 2015-07-20
----------------------
##### Fixed
- Geo Widget map tiles only partially loaded if widget not visible upon initial form load.
- Nested branches not evaluated when parent is enabled.

[3.6.1] - 2015-06-24
------------------------
##### Fixed
- A note following a traditional table is formatted as a group label.

[3.6.0] - 2015-06-23
------------------------
##### Added
- A valuechange event is fired to facilitate an external auto-save feature.

##### Fixed
- A note preceding a traditional table is formatted as a group label.

[3.5.13] - 2015-06-18
------------------------
##### Fixed
- Groups and repeats missing from print view in pages mode.
- Sidebar handle is shown up in print view.
- Back button in pages shows merged pages after form reset.
- First page in pages mode is shown if it is disabled.

[3.5.12] - 2015-06-16
------------------------
##### Fixed
- Firefox only prints first page.
- Records with nested repeats loaded incorrectly and completely corrupting model.


[3.5.11] - 2015-06-02
------------------------
##### Changed
- Improved performance in logic evaluation.

[3.5.10] - 2015-05-28
------------------------
##### Changed
- Faster loading

##### Fixed
- Indexed-repeat() position(..) parameter and nested expressions caused function to fail.
- Non-relevant questions inside a repeat clone are shown but should be hidden.
- Calculations inside repeat clones are not evaluated upon form load

[3.5.9] - 2015-05-22
------------------------
##### Added
- Indexed-repeat() function

##### Fixed
- Calculation on a select_one question inside a repeat clone throws an exception.

[3.5.8] - 2015-05-04
-------------------------
##### Added
- Enable print script for themes based on Grid Theme that include "grid" in the theme name.

##### Changed
- Do not attempt to load table/radio/likert/media grid widgets when they are not required.
- Even faster validation for some forms.

##### Fixed
- Screen view remaining at full screen width after printing form with Grid Theme.
- Print dialog buttons not visible with Grid Theme (Enketo Express).
- Sequential notes overlapping each other with Grid Theme.
- Exception occuring in some specific cases when loading an existing record.

[3.5.7] - 2015-04-29
------------------------
##### Changed
- Faster default repeat creation (with repeat count).
- Faster click responses, especially on low-powered devices.
- Faster widget loading.
- Grid theme breakpoint to switch to single column changed from 700px to 600px.

##### Fixed
- Form wider than screen on small screens.
- Sidebar records and handle not clickable in pages mode on touchscreens.

[3.5.6] - 2015-04-23
-----------------
##### Changed
- Branch update performance
- Calculate update performance
- Widget loading performance

##### Fixed
- Top border missing and margin too small when a visible note is preceded by a hidden note.
- Any branch containing a geoshape widget caused an exception to occur when it was made non-relevant.
- Appearance 'horizontal' no longer displays with evenly-spaced columns.
- Some buttons in Safari have border and background when they shouldn't have.
- Side bar in Safari is not stretching to bottom.

[3.5.5] - 2015-04-17
-----------------
##### Fixed
- When existing instance with multiple repeats is loaded, only the first repeat is created and populated.
- XML nodenames ending with hyphen or underscore failed to be found.

[3.5.4] - 2015-04-16
---------------
##### Fixed
- **critical**: All non-native form logic fails to evaluate in Internet Explorer.

[3.5.3] - 2015-04-15
---------------------
##### Changed
- Text and number inputs in Grid Theme now displayed in full cell width.

##### Fixed
- Remove existing content form external instances.
- Geowidget not displayed displayed in full width in pages mode with Grid Theme.
- Hide/show input fields button in Geo Widgets in Grid Theme not clickable after clicking show.

[3.5.2] - 2015-04-08
---------------
##### Added
- Support for current()

##### Fixed
- Very slow validation performance when form contains radiobuttons or checkboxes.
- Slow XPath evaluator performance by avoiding the need to clone the XML model.
- Maintaining default namespaces in model & instance when provided in XForm.

[3.5.1] - 2015-03-20
-------------
##### Changed
- Updated tests to latest Jasmine and switched to Karma test runner.

#### Fixed
- Save as Draft functionality broken in pages mode.

[3.5.0] - 2015-02-27
---------
##### Added
- Ability to pass external XML data to the form object.

##### Changed
- Updated installation instructions.
- Cleaner, more robust way of passing parameters to instantiate Form.
- Sample form link in developer template.
- If itext reference element for itemset item cannot be found use the itextref ID as label instead.

[3.4.1] - 2015-02-19
---------
##### Added
- Change log

##### Fixed
- In media input widget, when media is too large, record is still populated with file name.

[3.4.0] - 2015-02-19
---------
##### Added
- Ability to extract meta data from cookies signed with the Express cookie-parser.

[3.3.3] - 2015-02-09
---------
##### Fixed
- Grid theme in pages mode shows all questions at full width.
- Loading a file input with existing value.

[3.3.2] - 2015-01-23
---------
##### Added
- Ability to extract instanceName from model


[3.3.1] - 2015-01-06
---------
##### Fixed
- Printing the Grid Theme

[3.3.0] - 2015-01-05
----------
##### Added
- Pages mode in developer template.
- Grid Theme thanks to KoBo and iMMAP

##### Fixed
- File name not cleared when file is removed from File widget.

[3.2.5] - 2014-12-31
----------
##### Fixed
- Two markdown links in a note get merged into one.
- Repeats without a wrapping <group> do not work.

[3.2.4] - 2014-12-30
---------
##### Changed
- Improved performance of repeat cloning.
- Margin around repeat buttons.

##### Fixed
- Select minimal in first repeat unchecks itself when it is cloned.
- False edited event fired.

[3.2.3] - 2014-12-19
---------
##### Fixed
- Short form and short page does not get stretched to bottom of window.

[3.2.3] - 2014-12-16
----------
##### Fixed
- App breaks when form is loaded with default value for geopoint, geoshape or geotrace widget.

[3.2.1] - 2014-12-15
----------
##### Fixed
- Logic not re-evaluated when /path/to/node/* syntax is used.

[3.2.0] - 2014-12-12
----------
##### Added
- Ability to use Google Map tile layers in geo widgets

##### Fixed
- In sample development controller, files from file inputs not obtained.
