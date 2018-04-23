Change Log
=========
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

[Unreleased]
----------------------
##### Fixed
- In Safari, readonly checkboxes and radiobuttons can still be manipulated and WILL modify the record, even if the UI doesn't update.

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
- Nodenames with dots cause an exception during extraction of a serialized model without irrelevant nodes.

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
- Readonly fields with calculation are not cleared in model when they become irrelevant if clearIrrelevantImmediately is set to `true`.
- Calculated items without form control were calculated even if they were inside an irrelevant group.
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
- In some occasions, nested repeat nodes that are relevant are removed from the record string as if they were irrelevant.
- In tables, the heading row (appearance=label) can be misaligned with the lower rows.
- Cloned select minimal question with relevant inside repeat is hidden when loading record with multiple repeats.
- Draw/signature widget is instantiated for file input types other than "image".
- Draw/signature widget is never enabled if it has a relevant expression.
- File inputs do not always clear properly when they become irrelevant.

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
- Ability to hide irrelevant questions from printout (now the default) with a setting.
 
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
- Error message when removing irrelevant nodes because the node cannot be found.

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
- Exception occurs when obtaining cleaned-of-irrelevants model string if repeat has a relevant and a repeat-count of 0.

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
- Method to obtain primary instance without irrelevant nodes.

##### Fixed
- In pages mode, if page (group) is relevant but only includes irrelevant questions, it is displayed as an empty page.
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
- Value not cleared from widget UI when it becomes irrelevant and clearIrrelevantImmediately is set to `true`.

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
- Option to let engine keep irrelevant values until new function `clearIrrelevant` is called.

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
- Widgets not disabled when they become irrelevant.

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
- Irrelevant questions inside a repeat clone are shown but should be hidden.
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
- Any branch containing a geoshape widget caused an exception to occur when it was made irrelevant.
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
