import { IOptions } from 'sanitize-html';

export const sanitizeOptions: IOptions = {

  allowedTags: [
    'p', 'div', 'pre', 
    'br',
    'a',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'strong', 'em',
    'ol', 'ul', 'li',
    'table', 'colgroup', 'col', 'tbody', 'tr', 'td', 'thead', 
  ],

  //TODO: accessibility attributes? How do those work with tinyMCE?
  allowedAttributes: {
    '*': ['style'],
    'a': ['href', 'title'],
    'table': ['border'],
  },

  allowedStyles: {
    '*': {'text-align': [/.*/], 'padding-left': [/.*/], 'width': [/.*/], 'height': [/.*/], },
    'table': {'border-collapse': [/.*/], 'border-width': [/.*/], 'border': [/.*/] },
    'td': {'border-width': [/.*/] },
  },

  //transformTags: {
    //'*': function(tagName, attribs) {
      //if(attribs.style) {
        //console.log(`style for ${tagName}: `, attribs);
      //}
      //return {
        //tagName: tagName,
        //attribs: attribs
      //}
    //}
  //},

  //selfClosing: [], // default [ 'img', 'br', 'hr', 'area', 'base', 'basefont', 'input', 'link', 'meta' ], 

}
