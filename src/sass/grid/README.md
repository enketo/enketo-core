enketo-grid-theme
=================

A "print-first" grid theme for Enketo

###Guidance

The grid is optional. If you don't change the XLSForm, each question will get a separate row. 

If you'd like to combine questions on the same row (ie. create a grid), you can do so by specifying widths on groups, repeats, questions, triggers and notes. In XLS form this done in the appearance column (but this should be supported in any form builder by adding appearance attributes). Valid widths are: __w1, w2, w3, .... w10__. The amount of extra work required to create a grid is very minimal.

####Containers

Top-level Groups and Repeats are grid containers. They have a default width of 4 _units_ (if you don't specify anything). If you prefer to divide rows into less or more units you can do so by specifying appearance _w3_, or _w5_ etc. It is recommended to __not give a width to nested groups or repeats__ as this will likely not provide a desirable result.

####Cells

Questions, notes, and triggers are grid cells. The width of a cell can be specified in a similar manner as with a container. If you specify _w2_ it will take up 2 units. If you don't specify a width, it will display in a full row. 

####Row

A row contains one or more questions, notes and triggers. __The grid theme will always display a row in the full width of the screen, due to some built-in intelligence__.


####Horizontal options

Add appearance _horizontal_ to any _select\_one_ or _select\_multiple_ question to display the options horizontally.
Add appearance _no-print_ to any question, note or trigger you do not want printed. Other existing appearances such as _multiline_, _maps_, _minimal_ etc. will work in the grid theme too.

