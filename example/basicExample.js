
import React, { Component } from 'react'
import {
  StyleSheet,
  Text,
  View
} from 'react-native'

import SortableGrid from 'react-native-sortable-grid'

export default class basicExample extends Component {

  constructor() {
    super()
    this.alphabets = ['A','B','C','D','E','F',
                      'G','H','I','J','K','L',
                      'M','N','O','P','Q','R',
                      'S','T','U','V','W','X']
  }

  getColor() {
    let r = this.randomRGB()
    let g = this.randomRGB()
    let b = this.randomRGB()
    return 'rgb(' + r + ', ' + g + ', ' + b + ')'
  }
  randomRGB = () => 160 + Math.random()*85

  render() {
    return (
      <SortableGrid
        blockTransitionDuration      = { 400 }
        activeBlockCenteringDuration = { 200 }
        itemsPerRow                  = { 4 }
        dragActivationTreshold       = { 200 }
        onDragRelease                = { (itemOrder) => console.log("Drag was released, the blocks are in the following order: ", itemOrder) }
        onDragStart                  = { ()          => console.log("Some block is being dragged now!") }
      >
        {
          this.alphabets.map( (letter, index) =>
            <View key={index} style={[styles.block, { backgroundColor: this.getColor() }]}>
              <Text style={{color: 'white', fontSize: 50}}>{letter}</Text>
            </View>
          )
        }
      </SortableGrid>
    )
  }

}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    margin: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
