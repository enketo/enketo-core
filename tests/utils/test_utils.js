var loadForm = function(filename, editStr){
	var strings = mockForms1[filename];
	return new Form(strings.html_form, strings.xml_model, editStr);
};

var loadDrishtiForm = function(filename, editStr){
	var strings = mockForms2[filename];
	return new Form(strings.html_form, strings.xml_model, editStr);
};

var getFormDataO = function(filename){
	//$('body').append('<form></form>');
	var form = new Form('<form></form>', mockForms1[filename].xml_model);
	form.init();
	return form.getDataO();
};