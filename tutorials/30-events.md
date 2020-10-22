### Events in Enketo Core

##### inputupdate
Fired on a form control when it is programmatically updated and when this results in a change in value

#### xforms-value-changed
Fired on a form control when it is updated directly by the user and when this results in a change in value

##### invalidated
Fired on a form control when it has failed constraint, datatype, or required validation.

##### dataupdate
Fired on model.$events, when a single model value has changed its value, a repeat is added, or a node is removed. It passes an "update object". This event is propagated for external use by firing it on the form.or element as well.

##### odk-instance-first-load
Fired on model.events when a new record (instance) is loaded for the first time. It's described here: [odk-instance-first-load](https://opendatakit.github.io/xforms-spec/#event:odk-instance-first-load).

##### odk-new-repeat
Fired on a newly added repeat. It's described here: [odk-instance-first-load](https://opendatakit.github.io/xforms-spec/#event:odk-new-repeat).

##### removerepeat
Fired on the repeat or repeat element immediately following a removed repeat.

##### removed
Fired on model.events, when a node is removed. It passes an "update object". This event is propagated for external use by firing it on the form.or element as well.

##### goto-irrelevant
Fired on form control when an attempt is made to 'go to' this field but it is hidden from view because it is non-relevant.

##### goto-invisible
Fired on form control when an attempt is made to 'go to' this field but it is hidden from view because it is has no form control.

##### pageflip
Fired when user flips to a new page, on the page element itself.

##### edited
Fired on form.or element when user makes first edit in form. Fires only once.

##### validation-complete
Fired on form.or element when validation completes.

##### progress-update
Fired when the user moves to a different question in the form.

