### Events in Enketo Core

##### inputupdate
Fired on a form control when it is programmatically updated and when this results in a change in value

#### valuechange
Fired on a form control when it is updated directly by the user and when this results in a change in value

##### invalidated
Fired on a form control when it has failed constraint, datatype, or required validation. 

##### dataupdate
Fired on model.$events, when a single model value has changed its value, a repeat is added, or a node is removed. It passes an "update object". This event is propagated for external use by firing it on the form.or element as well.

##### addrepeat
Fired on newly added repeat.

##### removerepeat
Fired on the repeat or repeat element immediately following a removed repeat.

##### removed
Fired on model.$events, when a node is removed. It passes an "update object". This event is propagated for external use by firing it on the form.or element as well.

##### gotohidden.enketo
Fired on form control when an attempt is made to 'go to' this field but it is hidden from view because it is irrelevant.

##### pageflip
Fired when user flips to a new page, on the page element itself.

##### edited
Fired on form.or element when user makes first edit in form. Fires only once.

##### validationcomplete
Fired on form.or element when validation completes.