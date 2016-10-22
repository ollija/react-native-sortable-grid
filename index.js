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
const DOUBLETAP_TRESHOLD              = 150 // Milliseconds

class DraggableGrid extends Component {

  constructor() {
    super()

    this.blockTransitionDuration      = BLOCK_TRANSITION_DURATION
    this.activeBlockCenteringDuration = ACTIVE_BLOCK_CENTERING_DURATION
    this.itemsPerRow                  = ITEMS_PER_ROW
    this.dragActivationTreshold       = DRAG_ACTIVATION_TRESHOLD
    this.doubleTapTreshold            = DOUBLETAP_TRESHOLD
    this.onDragRelease                = () => {}
    this.onDragStart                  = () => {}

    this.itemOrder         = []
    this.dragPosition      = null
    this.activeBlockOffset = null
    this.rows              = null
    this.ghostBlocks       = []

    this.tapTimer          = null
    this.tapIgnore         = false
    this.doubleTapWait     = false

    this.state = {
      gridLayout: null,
      blockPositions: [],
      startDragWiggle: new Animated.Value(0),
      activeBlock: null,
      blockWidth: null
    }
  }

  componentWillMount = () => this.createTouchHandlers()

  componentDidMount = () => this.handleNewProps(this.props)

  componentWillUnmount = () => { if (this.tapTimer) clearTimeout(this.tapTimer) }

  componentWillReceiveProps = (properties) => this.handleNewProps(properties)

  handleNewProps = (properties) => {
    this._assignReceivedPropertiesIntoThis(properties)
    this._countRows(properties)
    this._saveItemOrder(properties.children)
  }

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
    if (this.state.activeBlock != null) {

      let yChokeAmount = Math.max(0, (this.activeBlockOffset.y + moveY) - (this.state.gridLayout.height - this.blockWidth))
      let xChokeAmount = Math.max(0, (this.activeBlockOffset.x + moveX) - (this.state.gridLayout.width - this.blockWidth))
      let yMinChokeAmount = Math.min(0, this.activeBlockOffset.y + moveY)
      let xMinChokeAmount = Math.min(0, this.activeBlockOffset.x + moveX)

      let dragPosition = { x: moveX - xChokeAmount - xMinChokeAmount, y: moveY - yChokeAmount - yMinChokeAmount }
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

      this.ghostBlocks.forEach( ghostBlockPosition => {
        let distance = this._getDistanceTo(ghostBlockPosition)
        if (distance < closestDistance) {
          closest = this.state.activeBlock
          closestDistance = distance
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
    if (this.state.activeBlock != null) {
      this.state.blockPositions[this.state.activeBlock].currentPosition.flattenOffset()
      Animated.timing(
        this.state.blockPositions[this.state.activeBlock].currentPosition,
        { toValue: this.state.blockPositions[this.state.activeBlock].origin, duration: this.activeBlockCenteringDuration }
      ).start()
      this.setState({activeBlock: null})
      let itemOrder = _.sortBy(this.itemOrder, item=>item.order)
      this.onDragRelease( {itemOrder} )
    }
  }

  assessGridSize = ({nativeEvent}) => {
    this.blockWidth = nativeEvent.layout.width / this.itemsPerRow
    this.setState({
      gridLayout: nativeEvent.layout,
      blockWidth: this.blockWidth
    })
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

      if (blockPositions.length == this.props.children.length) {
        this.setGhostPositions()
      }
    }
  }

  setGhostPositions = () => {
    let blockWidth = this.state.blockWidth
    let fullGridItemCount = this.rows * this.itemsPerRow
    let ghostBlockCount = fullGridItemCount - this.props.children.length
    let y = blockWidth * (this.rows - 1)
    let initialX =  blockWidth * (this.itemsPerRow - ghostBlockCount)

    for (let i = 0; i < ghostBlockCount; ++i) {
      let x = initialX + blockWidth * i
      this.ghostBlocks.push({x, y})
    }
  }

  activateDrag = (key) => () => {
    this.onDragStart(this.itemOrder[key])
    this.setState({activeBlock: key})
    this.state.startDragWiggle.setValue(20)
    Animated.spring(this.state.startDragWiggle, {
      toValue: 0,
      velocity: 2000,
      tension: 2000,
      friction: 5
    }).start()
  }

  handleTap = ({onTap, onDoubleTap}) => () => {
    if (this.tapIgnore) this._resetTapIgnoreTime()
    else if (onDoubleTap != null) this.doubleTapWait ? this._onDoubleTap(onDoubleTap) : this._onSingleTap(onTap)
    else onTap()
  }

  render = () => {
    let gridLayout = this.state.gridLayout
    let blockWidth = this.state.blockWidth
    let blockPositionsSet = this.state.blockPositions.length == this.props.children.length

    return (
      <View
        style = {[
          styles.draggableGrid,
          this.props.style,
          { height: blockWidth * this.rows }
        ]}
        onLayout= { this.assessGridSize }
      >
        { gridLayout &&
          this.props.children.map( (item, key) =>
            <Animated.View
              key = {key}
              style = {[
                { width: blockWidth,
                  height: blockWidth,
                  justifyContent: 'center' },

                blockPositionsSet &&
                { position: 'absolute',
                  top: this.state.blockPositions[key].currentPosition.getLayout().top,
                  left: this.state.blockPositions[key].currentPosition.getLayout().left
                },

                this.state.activeBlock == key && this._blockActivationWiggle(),
                this.state.activeBlock == key && { zIndex: 1 }

                ]}
              onLayout = { this.saveBlockPositions(key) }
              {...this._panResponder.panHandlers}
            >
              <TouchableWithoutFeedback
                style        = {{ flex: 1 }}
                delayPressIn = { this.dragActivationTreshold }
                onPressIn    = { this.activateDrag(key) }
                onPress      = { this.handleTap(item.props) }>

                { item }

              </TouchableWithoutFeedback>
            </Animated.View>
          )
        }
      </View>
  )}

  // Helpers & other boring stuff

  _saveItemOrder = (items) => {
    items.forEach( ({key, ref}, index) => {
      if (!_.findKey(this.itemOrder, (oldItem) => oldItem.key === key)) {
        this.itemOrder.push({ key, ref, order: index })
      }
    })
  }

  _countRows = (properties) => {
    if (!this.rows ||
        this.itemsPerRow != properties.itemsPerRow ||
        properties.children.length !== this.props.children.length) {
      this.rows = Math.ceil(properties.children.length / this.itemsPerRow)
    }
  }

  _getDistanceTo = (point) => {
    let xDistance = this.dragPosition.x + this.activeBlockOffset.x - point.x
    let yDistance = this.dragPosition.y + this.activeBlockOffset.y - point.y
    return Math.sqrt( Math.pow(xDistance, 2) + Math.pow(yDistance, 2) )
  }

  _blockActivationWiggle = () => {
    return { transform: [{ rotate: this.state.startDragWiggle.interpolate({
      inputRange:  [0, 360],
      outputRange: ['0 deg', '360 deg']})}]}
  }

  _assignReceivedPropertiesIntoThis(properties) {
    Object.keys(properties).forEach(property => {
      if (this[property])
        this[property] = properties[property]
    })
  }

  _onSingleTap = (onTap) => {
    this.doubleTapWait = true
    this.tapTimer = setTimeout( () => {
      this.doubleTapWait = false
      onTap()
    }, this.doubleTapTreshold)
  }

  _onDoubleTap = (onDoubleTap) => {
    this._resetTapIgnoreTime()
    this.doubleTapWait = false
    this.tapIgnore = true
    onDoubleTap()
  }

  _resetTapIgnoreTime = () => {
    clearTimeout(this.tapTimer)
    this.tapTimer = setTimeout(() => this.tapIgnore = false, this.doubleTapTreshold)
  }

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
}

const styles = StyleSheet.create({
draggableGrid: {
  flex: 1,
  flexDirection: 'row',
  flexWrap: 'wrap'
}
})

module.exports = DraggableGrid
