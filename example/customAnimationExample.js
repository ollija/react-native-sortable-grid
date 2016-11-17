
import React, { Component } from 'react'
import {
  StyleSheet,
  Text,
  Animated,
  View
} from 'react-native'

import SortableGrid from 'react-native-sortable-grid'

export default class basicExample extends Component {

  constructor() {
    super()
    this.numbers = [0,1,2,3,4,5,6,7,8,9,10,11]
    this.state = {
      animation: new Animated.Value(0),
    }
  }

  getColor() {
    let r = this.randomRGB()
    let g = this.randomRGB()
    let b = this.randomRGB()
    return 'rgb(' + r + ', ' + g + ', ' + b + ')'
  }
  randomRGB = () => 160 + Math.random()*85

  startCustomAnimation = () => {
    console.log("Custom animation started!")

    Animated.timing(
      this.state.animation,
      { toValue: 100, duration: 500 }
    ).start( () => {

      Animated.timing(
        this.state.animation,
        { toValue: 0, duration: 500 }
      ).start()

    })
  }

  getDragStartAnimation = () => {
    return { transform: [
      {
        scaleX: this.state.animation.interpolate({
          inputRange: [0, 100],
          outputRange: [1, -1.5],
        })
      },
      {
        scaleY: this.state.animation.interpolate({
          inputRange: [0, 100],
          outputRange: [1, 1.5],
        })
      },
      { rotate: this.state.animation.interpolate({
        inputRange:  [0, 100],
        outputRange: ['0 deg', '450 deg']})
      }
    ]}
  }

  render() {
    return (
      <View style={{paddingTop: 40}}>
        <Text style={{alignSelf: 'center', fontWeight: 'bold', marginBottom: 10}}>Custom animation</Text>
        <SortableGrid
          blockTransitionDuration      = { 400 }
          activeBlockCenteringDuration = { 200 }
          itemsPerRow                  = { 4 }
          dragActivationTreshold       = { 200 }
          dragStartAnimation           = { this.getDragStartAnimation() }
          onDragRelease                = { (itemOrder) => console.log("Drag was released, the blocks are in the following order: ", itemOrder) }
          onDragStart                  = { this.startCustomAnimation }
          ref                          = { 'SortableGrid' }
        >
          {
            this.numbers.map( (letter, index) =>
              <View
                ref={ 'itemref_' + index }
                key={ index }
                style={[
                  styles.block,
                  { backgroundColor: this.getColor() }
                ]}
              >
                <Text style={{color: 'white', fontSize: 45}}>{letter}</Text>
              </View>
            )
          }
        </SortableGrid>
      </View>
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
