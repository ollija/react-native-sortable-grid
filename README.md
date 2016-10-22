
<h3 align="center" style="margin-bottom: 21px;">
  Drag-and-drop -style rearrangable grid view
</h3>

<p align="center">
  <img alt="Issue Stats" src="http://i.giphy.com/gcB8YYVtL2BsA.gif">
</p>

<p align="center">
  <a href="https://gitter.im/react-native-sortable-grid/Lobby">
    ![Gitter chat](https://badges.gitter.im/ollija/gitter.png)
  </a>
</p>


# react-native-sortable-grid

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

 -  ``` blockTransitionDuration ``` **Number**

  How long should the transition of a passive block take when the active block takes its place (milliseconds)

 -  ``` activeBlockCenteringDuration ``` **Number**

  How long should it take for the block that is being dragged to seek its place after it's released  (milliseconds)

 -  ``` itemsPerRow ``` **Number**

  How many items should be placed on one row

 -  ``` dragActivationTreshold ``` **Number**

  How long must the user hold the press on the block until it becomes active and can be dragged (milliseconds)

 -  ``` onDragStart ``` **Callback**

  Function that is called when the dragging starts. This can be used to lock other touch responders from listening to the touch such as ScrollViews and Swipers.

 -  ``` onDragRelease ``` **Callback** => *(itemOrder)*

  Function that is executed after the drag is released. Will return the new item order.



## SortableGrid's children's properties

 -  ``` onTap ``` **Callback**

  Function that is executed when the block is tapped, but not pressed for long enough to activate the drag.


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
