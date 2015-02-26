Change Log
=========
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

[3.5.0] 
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
##### Fixed
- In media input widget, when media is too large, record is still populated with file name.

##### Added
- Change log

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
