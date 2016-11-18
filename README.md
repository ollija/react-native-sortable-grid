
<h3 align="center" style="margin-bottom: 21px;">
  Drag-and-drop -style rearrangable grid view
</h3>

<p align="center">
  <img alt="Issue Stats" src="http://i.giphy.com/gcB8YYVtL2BsA.gif">
</p>

# react-native-sortable-grid

[![Join the chat at https://gitter.im/react-native-sortable-grid/Lobby](https://badges.gitter.im/react-native-sortable-grid/Lobby.svg)](https://gitter.im/react-native-sortable-grid/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm](https://img.shields.io/npm/dm/react-native-sortable-grid.svg)]()
[![Sponsored by Leonidas](https://img.shields.io/badge/sponsored%20by-leonidas-389fc1.svg)](https://leonidasoy.fi/opensource)
[![npm](https://img.shields.io/npm/l/react-native-sortable-grid.svg)]()
[![David](https://img.shields.io/david/ollija/react-native-sortable-grid.svg)]()
[![David](https://img.shields.io/david/dev/ollija/react-native-sortable-grid.svg)]()

## Installation

``` npm i react-native-sortable-grid --save ```

## Usage

```
import SortableGrid from 'react-native-sortable-grid'

...

<SortableGrid>
  {
    ['a', 'b', 'c'].map( (letter, index) =>

      <View key={index}>
        <Text>{letter}</Text>
      </View>

    )
  }
</SortableGrid>

```

## SortableGrid properties

 -  ``` style ``` **Object**

  Custom styles to override or complement the sortableGrid native style.

  *  When a row becomes empty of items due to item deletion, the height of the grid is smoothly adjusted to fit the new rows. However, passing ```flex:1``` inside the style prop will cause the grid to fill up the available space and not adjust height when rows become empty.
  * User cannot drag items outside of the grid. Assigning ```flex:1``` will expand the grid, therefore giving more space for the items to be dragged in.
  * When deleting items from the last row on Android, the items can get clipped. You can workaround this by giving the grid ```bottomPadding```. (This is <a href="https://facebook.github.io/react-native/releases/0.26/docs/known-issues.html#the-overflow-style-property-defaults-to-hidden-and-cannot-be-changed-on-android">a known issue</a> with ```overflow```-property on Android)


 -  ``` blockTransitionDuration ``` **Number**

  How long should the transition of a passive block take when the active block takes its place (milliseconds)

 -  ``` activeBlockCenteringDuration ``` **Number**

  How long should it take for the block that is being dragged to seek its place after it's released  (milliseconds)

 -  ``` itemsPerRow ``` **Number**

  How many items should be placed on one row

 -  ``` dragActivationTreshold ``` **Number**

  How long must the user hold the press on the block until it becomes active and can be dragged (milliseconds)

 -  ``` doubleTapTreshold ``` **Number**

  How long will the execution wait for the second tap before deciding it was a single tap (milliseconds).
  Will be omitted if no onDoubleTap-property is given to the item being tapped - In which case single-tap callback will be executed instantly

 -  ``` onDragStart ``` **Callback** *(activeItem)*

  Function that is called when the dragging starts. This can be used to lock other touch responders from listening to the touch such as ScrollViews and Swipers.

 -  ``` onDragRelease ``` **Callback** *(itemOrder)*

  Function that is executed after the drag is released. Will return the new item order.

 -  ``` onDeleteItem ``` **Callback** *(item)*

  Function that is executed item is deleted. Will return the properties of the deleted item.

 -  ``` dragStartAnimation ``` **Object**

  Custom animation to override the default wiggle. Must be an object containing a key ```transform```, which is an array of transformations. Read about [transforms](https://facebook.github.io/react-native/docs/transforms.html) and [animations](https://facebook.github.io/react-native/docs/animated.html) and [see the example](example/customAnimationExample.js#L47) to learn how to use this.

## SortableGrid methods

 -  ``` toggleDeleteMode ``` accepts no arguments

  Calling this will toggle item deletion mode on/off. Will return object ```{ deleteModeOn: true/false }```.


## SortableGrid's children's properties

 -  ``` onTap ``` **Callback**

  Function that is executed when the block is tapped once, but not pressed for long enough to activate the drag.

 -  ``` onDoubleTap ``` **Callback**

  Function that is executed when the block is double tapped within a timeframe of ```doubleTapTreshold``` (default 150ms). Assigning this will delay the execution of ```onTap```. Omitting this will cause all taps to be handled as single taps, regardless of their frequency.


## onDragRelease return value looks like this:

```
Object {

  itemOrder: Array [
    0: Object {
      key: "1"
      order: 0
      ref: null
    }
    1: Object {
      key: "5"
      order: 1
      ref: null
    }
    n: Object ...
  ]

}
```

## Full SortableGrid example:

```
 <SortableGrid
   blockTransitionDuration      = { 400 }
   activeBlockCenteringDuration = { 200 }
   itemsPerRow                  = { 4 }
   dragActivationTreshold       = { 200 }
   onDragRelease                = { (itemOrder) => console.log("Drag was released, the blocks are in the following order: ", itemOrder) }
   onDragStart                  = { ()          => console.log("Some block is being dragged now!") } >

   {
     ['a', 'b', 'c'].map( (letter, index) =>

       <View key={index} onTap={() => console.log("Item number:", index, "was tapped!") }>
         <Text>{letter}</Text>
       </View>

     )
   }

 </SortableGrid>

```

## Demos

<p align="center">

  <b>Basic item deletion</b><br>toggleDeleteMode() is called during onTap in this example<br><br>
  <img alt="Issue Stats" src="http://i.giphy.com/S4OC2Rt4JXEK4.gif">
  <br><br>
  
  <b>Custom block animation can be passed to the grid<br><br>
  <img alt="Custom animation" src="http://i.giphy.com/FPyiKkqWf1fLW.gif">
  <br><br>

  <b>Smooth resizing of the grid when the last row becomes empty:</b><br><br>
  <img alt="Issue Stats" src="http://i.giphy.com/PEU01yJh997qM.gif">
  <br><br>

  <b>No grid resizing if the grid has <span style="color: white;
  font-family: Consolas,
                Monaco,
                Lucida Console,
                Liberation Mono,
                DejaVu Sans Mono,
                Bitstream Vera Sans Mono,
                Courier New;
  font-size: 13px;
  background-color: rgba(255,255,255, 0.07);
  padding: 3px;">flex:1</span> assigned:</b><br><br>
  <img alt="Issue Stats" src="http://i.giphy.com/fxBIhIkzydDW0.gif">
  <br><br>

  <b>The item drag is constrained within the grid:</b><br><br>
  <img alt="Issue Stats" src="http://i.giphy.com/4YsV4fvEmb9Dy.gif">
  <br><br>

  <b>With <span style="color: white;
  font-family: Consolas,
                Monaco,
                Lucida Console,
                Liberation Mono,
                DejaVu Sans Mono,
                Bitstream Vera Sans Mono,
                Courier New;
  font-size: 13px;
  background-color: rgba(255,255,255, 0.07);
  padding: 3px;">flex:1</span> there is more space to drag:</b><br><br>
  <img alt="Issue Stats" src="http://i.giphy.com/lX4NyomLbnRvi.gif">

</p>
