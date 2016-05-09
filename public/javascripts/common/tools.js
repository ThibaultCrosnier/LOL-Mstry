function checkVariable(value)
{
	return ( (value != undefined) && (value != null) );
}

String.prototype.toPascalCase = function()
{
	return this.replace(/\w+/g, function(w){return w[0].toUpperCase() + w.slice(1).toLowerCase();});
}

function thousandsSeparator(value)
{
	var str = "";
	while (value > 1000)
	{
		var rest = value % 1000;
		str = rest + ' ' + str;
		value = Math.floor(value / 1000);
	}
	
	if (value > 0)
		str = value + ' ' + str;
	
	return str;
}