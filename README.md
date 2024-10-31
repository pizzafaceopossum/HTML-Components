# XML Components
### Why? Can't you just use CSS or JavaScript?
This is a tool meant to drastically reduce work time when designing HTML specific styling. The inspiring use-case for this required inline styling only, with JavaScript unavailable as well. Which means no custom CSS classes, either. As a result, styling that would otherwise be a simple hour long task became a multi-day effort as repetetive copied and pasted code became a mess, and if you made a mistake on something that was pasted everywhere, it was hell to try to find everywhere that needed fixed.

### What are they?
XML Components are simple. You store a definition (some inner XML with other extra informational tags), and then you refer to the component in the document-to-be-exported-or-viewed-by-users. Either by exporting or providing users with the  script, components will be automatically turned into the XML that they represent.

### What can they do?
While the concept on its own is already powerful enough for the inspiring use-case (passing some HTML by reference rather than by value), I have added and will continue to add cherries on top.

#### Precise Attribute Inheritance
Components can be defined such that instances pass attributes in very precise ways: Enclosing portions of the body of a component definition with a \<cInherit\> tag indicates that matching attributes applied to *instanced copies* should be applied to all of the top level children of the \<cInherit\>. Furthermore, this works the same way for *style attributes*.

#### Child Placement
Component definitions also allow for the choice of where children of the *instance* are placed. I plan to flesh this out a bit with custom tags attributes to have a limit for one area before moving on to the next, or alternating between multiple spots.

#### Updates Apply Everywhere, Even Other Components
The obvious reason why components save so much time when unable to define your own CSS classes. If you put 30 copies of a component in your HTML, and you need to update the component, all of those copies are automatically handled. Otherwise, you'll have to copy and paste and make sure you get each one. But even better than that, components are recursive! So if you define Component A, and Component B contains a copy of Component A, nothing needs to be done in the definition of Component B.

### Future Plans
* More customizability
* Update the webpage to have a text editor and use that, right now I use live-editor and change the actual contents of index.html
* Style classes, which are essentially components but for groups of inline style attributes
* Import a document and try to replace portions with known components