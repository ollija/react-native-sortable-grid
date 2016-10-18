import React, { Component } from 'react';
import {
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  PanResponder,
  View
} from 'react-native'

import _ from 'lodash'

// Default values
const ITEMS_PER_ROW                   = 4
const DRAG_ACTIVATION_TRESHOLD        = 200 // Milliseconds
const BLOCK_TRANSITION_DURATION       = 300 // Milliseconds
const ACTIVE_BLOCK_CENTERING_DURATION = 200 // Milliseconds

class DraggableGrid extends Component {

  createTouchHandlers = () =>
    this._panResponder = PanResponder.create({
      onPanResponderTerminate:             (evt, gestureState) => {},
      onStartShouldSetPanResponder:        (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => false,
      onMoveShouldSetPanResponder:         (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture:  (evt, gestureState) => true,
      onShouldBlockNativeResponder:        (evt, gestureState) => false,
      onPanResponderTerminationRequest:    (evt, gestureState) => false,
      onPanResponderGrant:   this.onStartDrag,
      onPanResponderMove:    this.onMoveBlock,
      onPanResponderRelease: this.onReleaseBlock
    })

  constructor() {
    super()

    this.blockTransitionDuration      = BLOCK_TRANSITION_DURATION
    this.activeBlockCenteringDuration = ACTIVE_BLOCK_CENTERING_DURATION
    this.onDragRelease                = () => {}
    this.onDragStart                  = () => {}

    this.itemOrder         = null
    this.dragPosition      = null
    this.activeBlockOffset = null

    this.state = {
      gridLayout: null,
      blockPositions: [],
      startDragWiggle: new Animated.Value(0),
      activeBlock: null
    }
  }

  componentWillMount = () => {
    this.createTouchHandlers()
    this.itemOrder = _.map(this.props.children, ({key, ref}, index) => { return { key, ref, order: index } })

    if (this.props.blockTransitionDuration)
      this.blockTransitionDuration = this.props.blockTransitionDuration

    if (this.props.activeBlockCenteringDuration)
      this.activeBlockCenteringDuration = this.props.activeBlockCenteringDuration

    if (this.props.onDragRelease)
      this.onDragRelease = this.props.onDragRelease
  }

  componentDidMount = () => {}

  onStartDrag = (evt, gestureState) => {
    if (this.state.activeBlock != null) {
      let activeBlockPosition = this.state.blockPositions[ this.state.activeBlock ].origin
      let x = activeBlockPosition.x - gestureState.x0
      let y = activeBlockPosition.y - gestureState.y0
      this.activeBlockOffset = { x, y }
      this.state.blockPositions[this.state.activeBlock].currentPosition.setOffset({ x, y })
      this.state.blockPositions[this.state.activeBlock].currentPosition.setValue({ x: gestureState.moveX, y: gestureState.moveY })
    }
  }

  onMoveBlock = (evt, {moveX, moveY}) => {
    if (this.state.activeBlock) {
      let dragPosition = { x: moveX, y: moveY }
      this.dragPosition = dragPosition
      let originalPosition = this.state.blockPositions[ this.state.activeBlock ].origin
      let distanceToOrigin = this._getDistanceTo(originalPosition)
      this.state.blockPositions[this.state.activeBlock].currentPosition.setValue(dragPosition)

      let closest = this.state.activeBlock
      let closestDistance = distanceToOrigin
      this.state.blockPositions.forEach( (block, index) => {
        if (index !== this.state.activeBlock) {
          let blockPosition = block.origin
          let distance = this._getDistanceTo(blockPosition)
          if (distance < closestDistance) {
            closest = index
            closestDistance = distance
          }
        }
      })

      if (closest !== this.state.activeBlock) {
        Animated.timing(
          this.state.blockPositions[closest].currentPosition,
          {
            toValue: this.state.blockPositions[this.state.activeBlock].origin,
            duration: this.blockTransitionDuration
          }
        ).start()
        let blockPositions = this.state.blockPositions
        blockPositions[this.state.activeBlock].origin = blockPositions[closest].origin
        blockPositions[closest].origin = originalPosition
        this.setState({ blockPositions })

        var tempOrderIndex = this.itemOrder[this.state.activeBlock].order
        this.itemOrder[this.state.activeBlock].order = this.itemOrder[closest].order
        this.itemOrder[closest].order = tempOrderIndex
      }
    }
  }

  onReleaseBlock = (evt, gestureState) => {
    if (this.state.activeBlock) {
      this.state.blockPositions[this.state.activeBlock].currentPosition.flattenOffset()
      Animated.timing(
        this.state.blockPositions[this.state.activeBlock].currentPosition,
        { toValue: this.state.blockPositions[this.state.activeBlock].origin, duration: this.activeBlockCenteringDuration }
      ).start()
      this.setState({activeBlock: null})
      let itemOrder = _.orderBy(this.itemOrder, item=>item.order)
      this.onDragRelease( {itemOrder} )
    }
  }

  _getDistanceTo = (point) => {
    let xDistance = this.dragPosition.x + this.activeBlockOffset.x - point.x
    let yDistance = this.dragPosition.y + this.activeBlockOffset.y - point.y
    return Math.sqrt( Math.pow(xDistance, 2) + Math.pow(yDistance, 2) )
  }

  assessGridSize = ({nativeEvent}) => {
    if (!this.state.gridLayout) {
      this.setState({gridLayout: nativeEvent.layout})
    }
  }

  saveBlockPositions = (key) => ({nativeEvent}) => {
    if (this.state.blockPositions.length !== this.props.children.length) {
      let blockPositions = this.state.blockPositions;
      let thisPosition = {
        x: nativeEvent.layout.x,
        y: nativeEvent.layout.y
      }
      blockPositions[key] = {
        currentPosition : new Animated.ValueXY( thisPosition ),
        origin          : thisPosition
      }
      this.setState({ blockPositions })
    }
  }

  activateDrag = (key) => () => {
    this.setState({activeBlock: key})
    this.state.startDragWiggle.setValue(20)
    Animated.spring(this.state.startDragWiggle, {
      toValue: 0,
      velocity: 2000,
      tension: 2000,
      friction: 5
    }).start()
  }

  render = () => {
    let itemsPerRow = this.props.itemsPerRow || ITEMS_PER_ROW
    let dragActivationTreshold = this.props.dragActivationTreshold || DRAG_ACTIVATION_TRESHOLD
    let gridLayout = this.state.gridLayout
    let blockWidth = null
    let blockPositionsSet = this.state.blockPositions.length == this.props.children.length
    if (gridLayout) {
      blockWidth = gridLayout.width / itemsPerRow
    }

    let startDragWiggle = {transform: [{
     rotate: this.state.startDragWiggle.interpolate({
       inputRange: [0, 360],
       outputRange: ['0 deg', '360 deg']
     })
   }]}

    return (
      <View
        style   = { [styles.draggableGrid, this.props.style] }
        onLayout= { this.assessGridSize }
      >
        { gridLayout &&
          this.props.children.map( (item, key) =>
            <Animated.View
              key = {key}
              style = {[
                { width: blockWidth,
                  height: blockWidth },

                blockPositionsSet &&
                { flexWrap: 'nowrap',
                  position: 'absolute',
                  top: this.state.blockPositions[key].currentPosition.getLayout().top,
                  left: this.state.blockPositions[key].currentPosition.getLayout().left
                },

                this.state.activeBlock == key && startDragWiggle

                ]}
              onLayout = {this.saveBlockPositions(key)}
              {...this._panResponder.panHandlers}
            >
              <TouchableWithoutFeedback
                style        = {{ flex: 1 }}
                delayPressIn = { dragActivationTreshold }
                onPressIn    = { this.activateDrag(key) }>

                { item }

              </TouchableWithoutFeedback>
            </Animated.View>
          )
        }
      </View>
  )}

}

const styles = StyleSheet.create({
draggableGrid: {
  flex: 1,
  flexDirection: 'row',
  flexWrap: 'wrap'
}
})

module.exports = DraggableGrid
