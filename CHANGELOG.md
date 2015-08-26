Change Log
=========
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

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
