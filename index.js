import React, { Component } from 'react';
import {
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  PanResponder,
  Image,
  View
} from 'react-native'

import _ from 'lodash'

// Default values
const ITEMS_PER_ROW                   = 4
const DRAG_ACTIVATION_TRESHOLD        = 200 // Milliseconds
const BLOCK_TRANSITION_DURATION       = 300 // Milliseconds
const ACTIVE_BLOCK_CENTERING_DURATION = 200 // Milliseconds
const DOUBLETAP_TRESHOLD              = 150 // Milliseconds
const DOUBLETAP_DELETE_MODE           = true

class DraggableGrid extends Component {

  constructor() {
    super()

    this.blockTransitionDuration      = BLOCK_TRANSITION_DURATION
    this.activeBlockCenteringDuration = ACTIVE_BLOCK_CENTERING_DURATION
    this.itemsPerRow                  = ITEMS_PER_ROW
    this.dragActivationTreshold       = DRAG_ACTIVATION_TRESHOLD
    this.doubleTapTreshold            = DOUBLETAP_TRESHOLD
    this.doubleTapDeleteMode          = DOUBLETAP_DELETE_MODE
    this.onDragRelease                = () => {}
    this.onDragStart                  = () => {}

    this.itemOrder         = []
    this.dragPosition      = null
    this.activeBlockOffset = null
    this.rows              = null
    this.blockWidth        = null
    this.ghostBlocks       = []

    this.tapTimer          = null
    this.tapIgnore         = false
    this.doubleTapWait     = false

    this.state = {
      gridLayout: null,
      blockPositions: [],
      startDragWiggle: new Animated.Value(0),
      activeBlock: null,
      blockWidth: null,
      gridHeight: new Animated.Value(0),
      blockPositionsSetCount: 0,
      deleteModeOn: false,
      deletionSwipePercent: 0,
      deleteBlock: null,
      deleteBlockOpacity: new Animated.Value(1),
      deletedItems: []
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
    if (this.state.activeBlock != null && this._blockPositionsSet()) {

      if (this.state.deleteModeOn) return this.deleteModeMove({x: moveX, y: moveY})

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
        if (index !== this.state.activeBlock && block.origin) {
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
    let state = this.state
    let activeBlock = state.activeBlock

    if (activeBlock != null) {
      let activeBlockCurrentPosition = state.blockPositions[ activeBlock ].currentPosition
      let activeBlockOrigin = state.blockPositions[ activeBlock ].origin

      activeBlockCurrentPosition.flattenOffset()
      Animated.timing(
        activeBlockCurrentPosition,
        { toValue: activeBlockOrigin, duration: this.activeBlockCenteringDuration }
      ).start()

      if (state.deleteModeOn && state.deletionSwipePercent == 100) {
        this.setState({deleteBlock: activeBlock})
        state.deleteBlockOpacity.setValue(1)
        Animated.timing(
          state.deleteBlockOpacity,
          { toValue: 0, duration: 2 * this.activeBlockCenteringDuration }
        ).start( () => {
          let deletedItems = this.state.deletedItems
          deletedItems.push(activeBlock)
          this.setState({deletedItems})

          let itemOrder = _.cloneDeep(this.itemOrder)
          let currentBlockOrderNumber = itemOrder[activeBlock].order
          let orderedBlocks = _.sortBy(itemOrder, item=>item.order).filter(item => item.order != null)
          this.itemOrder[activeBlock].order = null

          let previousBlockOrder = null

          for (let i = orderedBlocks.length-1; i > currentBlockOrderNumber; --i) {
            let previousBlockIndex = _.findIndex(itemOrder, item => item.order == i - 1)
            let currentBlockIndex = _.findIndex(itemOrder, item => item.order == i)
            Animated.timing(
              this.state.blockPositions[currentBlockIndex].currentPosition,
              {
                toValue: this.state.blockPositions[previousBlockIndex].origin,
                duration: this.blockTransitionDuration
              }
            ).start()
            this.state.blockPositions[currentBlockIndex].origin = this.state.blockPositions[previousBlockIndex].origin
            this.itemOrder[currentBlockIndex].order--
          }
          state.blockPositions[ activeBlock ].origin = null
          this._countRows()
          this.setState({activeBlock: null})
          let sortedOrder = _.sortBy(this.itemOrder, item=>item.order)
          this.onDragRelease( {itemOrder: sortedOrder} )
        })
      }
      else {
        this.setState({activeBlock: null})
        let itemOrder = _.sortBy(this.itemOrder, item=>item.order)
        this.onDragRelease( {itemOrder} )
      }
    }
  }

  deleteModeMove = ({x, y}) => {
    let slideDistance = 50
    let moveY = y + this.activeBlockOffset.y - this.state.blockPositions[this.state.activeBlock].origin.y
    let adjustY = 0
    if (moveY < 0) adjustY = moveY
    else if (moveY > slideDistance) adjustY = moveY - slideDistance
    let deletionSwipePercent = (moveY - adjustY) / slideDistance * 100
    this.state.blockPositions[this.state.activeBlock].currentPosition.y.setValue(y - adjustY)
    this.setState({deletionSwipePercent})
  }

  assessGridSize = ({nativeEvent}) => {
    this.blockWidth = nativeEvent.layout.width / this.itemsPerRow
    this.setState({
      gridLayout: nativeEvent.layout,
      blockWidth: this.blockWidth
    })
  }

  saveBlockPositions = (key) => ({nativeEvent}) => {
    if (!this._blockPositionsSet()) {
      let blockPositions = this.state.blockPositions;
      let blockPositionsSetCount = ++this.state.blockPositionsSetCount;
      let thisPosition = {
        x: nativeEvent.layout.x,
        y: nativeEvent.layout.y
      }
      blockPositions[key] = {
        currentPosition : new Animated.ValueXY( thisPosition ),
        origin          : thisPosition
      }
      this.setState({ blockPositions, blockPositionsSetCount  })

      if (this._blockPositionsSet()) {
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

  handleTap = ({onTap = ()=>{}, onDoubleTap = ()=>{}}) => () => {
    if (this.state.deleteModeOn) this.setState({deleteModeOn: false})
    else if (this.tapIgnore) this._resetTapIgnoreTime()
    else if (onDoubleTap != null || this.doubleTapDeleteMode) {
      this.doubleTapWait ? this._onDoubleTap(onDoubleTap) : this._onSingleTap(onTap)
    } else onTap()
  }

  render = () => {
    let gridLayout = this.state.gridLayout
    let blockWidth = this.state.blockWidth
    let blockPositionsSet = this._blockPositionsSet()

    return (
      <Animated.View
        style = {[
          styles.draggableGrid,
          this.props.style,
          blockPositionsSet && { height: this.state.gridHeight }
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
                this.state.activeBlock == key && { zIndex: 1 },

                this.state.deleteBlock == key && { opacity: this.state.deleteBlockOpacity },

                this.state.deletedItems.indexOf(key) !== -1 && { opacity: 0, position: 'absolute', left: 0, top: 0, height: 0, width: 0 }

                ]}
              onLayout = { this.saveBlockPositions(key) }
              {...this._panResponder.panHandlers}
            >
              <TouchableWithoutFeedback
                style        = {{ flex: 1 }}
                delayPressIn = { this.dragActivationTreshold }
                onPressIn    = { this.activateDrag(key) }
                onPress      = { this.handleTap(item.props) }>

                <View style={{justifyContent: 'center'}}>
                  <View style={this.state.activeBlock == key &&
                  this.state.deleteModeOn && this.state.blockPositions[ key ].origin &&
                  { opacity: 1.5
                    - (this.state.blockPositions[ key ].currentPosition.y._value
                    + this.state.blockPositions[ key ].currentPosition.y._offset
                    - this.state.blockPositions[ key ].origin.y) / 50
                  }}>
                    { item }
                  </View>

                  { this.state.deleteModeOn &&
                    <Image
                    style={[{
                      position: 'absolute',
                      top: this.state.blockWidth/2 - 15,
                      left: this.state.blockWidth/2 - 15,
                      width: 30,
                      height: 30,
                      opacity: .2},
                      this.state.activeBlock == key && this.state.blockPositions[ key ].origin &&
                      { opacity: .2
                        + ((this.state.blockPositions[ key ].currentPosition.y._value
                        + this.state.blockPositions[ key ].currentPosition.y._offset
                        - this.state.blockPositions[ key ].origin.y) / 50) }]}
                    source={require('./assets/delete.png')}
                  />}

                </View>

              </TouchableWithoutFeedback>

            </Animated.View>
          )
        }
      </Animated.View>
  )}

  // Helpers & other boring stuff

  _blockPositionsSet = () => this.state.blockPositionsSetCount === this.props.children.length

  _saveItemOrder = (items) => {
    items.forEach( ({key, ref}, index) => {
      if (!_.findKey(this.itemOrder, (oldItem) => oldItem.key === key)) {
        this.itemOrder.push({ key, ref, order: index })
      }
    })
  }

  _countRows = (properties) => {
    if (!properties) {
      this.rows = Math.ceil((this.props.children.length - this.state.deletedItems.length) / this.itemsPerRow)
      this.state.gridHeight.setValue(this.rows * this.state.blockWidth)
    } else if (!this.rows || this.itemsPerRow != properties.itemsPerRow ||
      properties.children.length !== this.props.children.length) {
      this.rows = Math.ceil(properties.children.length / this.itemsPerRow)
      this.state.gridHeight.setValue(this.rows * this.state.blockWidth)
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
    if (this.doubleTapDeleteMode) this.setState({deleteModeOn: true})
    else onDoubleTap()
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
