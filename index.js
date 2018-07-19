import React, { Component } from 'react'
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
const NULL_FN                         = () => {}

class Block extends Component {

  render = () =>
    <Animated.View
      style = { this.props.style }
      onLayout = { this.props.onLayout }
      {...this.props.panHandlers}
    >
      <TouchableWithoutFeedback
        style          = {{ flex: 1 }}
        delayLongPress = { this.props.delayLongPress }
        onLongPress    = { () => this.props.inactive || this.props.onLongPress() }
        onPress        = { () => this.props.inactive || this.props.onPress() }>

          <View style={styles.itemImageContainer}>
            <View style={ this.props.itemWrapperStyle }>
              {this.props.children}
            </View>
            { this.props.deletionView }
          </View>

      </TouchableWithoutFeedback>
    </Animated.View>

}

class SortableGrid extends Component {

    render = () =>
      <Animated.View
        style={ this._getGridStyle() }
        onLayout={ this.assessGridSize }
      >
        { this.state.gridLayout &&
          this.items.map( (item, key) =>
            <Block
              key = { key }
              style = { this._getBlockStyle(key) }
              onLayout = { this.saveBlockPositions(key) }
              panHandlers = { this._panResponder.panHandlers }
              delayLongPress = { this.dragActivationTreshold }
              onLongPress = { this.activateDrag(key) }
              onPress = { this.handleTap(item.props) }
              itemWrapperStyle = { this._getItemWrapperStyle(key) }
              deletionView = { this._getDeletionView(key) }
              inactive = { item.props.inactive }
            >
              {item}
            </Block>
        )}
      </Animated.View>

  constructor() {
    super()

    this.blockTransitionDuration      = BLOCK_TRANSITION_DURATION
    this.activeBlockCenteringDuration = ACTIVE_BLOCK_CENTERING_DURATION
    this.itemsPerRow                  = ITEMS_PER_ROW
    this.dragActivationTreshold       = DRAG_ACTIVATION_TRESHOLD
    this.doubleTapTreshold            = DOUBLETAP_TRESHOLD
    this.onDragRelease                = NULL_FN
    this.onDragStart                  = NULL_FN
    this.onDeleteItem                 = NULL_FN
    this.dragStartAnimation           = null

    this.rows              = null
    this.dragPosition      = null
    this.activeBlockOffset = null
    this.blockWidth        = null
    this.gridHeightTarget  = null
    this.ghostBlocks       = []
    this.itemOrder         = []
    this.panCapture        = false
    this.items             = []
    this.initialLayoutDone = false
    this.initialDragDone   = false

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

  toggleDeleteMode = () => {
    let deleteModeOn = !this.state.deleteModeOn
    this.setState({ deleteModeOn })
    return { deleteModeOn }
  }

  componentWillMount = () => this.createTouchHandlers()

  componentDidMount = () => this.handleNewProps(this.props)

  componentWillUnmount = () => { if (this.tapTimer) clearTimeout(this.tapTimer) }

  componentWillReceiveProps = (properties) => this.handleNewProps(properties)

  handleNewProps = (properties) => {
    this._assignReceivedPropertiesIntoThis(properties)
    this._saveItemOrder(properties.children)
    this._removeDisappearedChildren(properties.children)
  }

  onStartDrag = (evt, gestureState) => {
    if (this.state.activeBlock != null) {
      let activeBlockPosition = this._getActiveBlock().origin
      let x = activeBlockPosition.x - gestureState.x0
      let y = activeBlockPosition.y - gestureState.y0
      this.activeBlockOffset = { x, y }
      this._getActiveBlock().currentPosition.setOffset({ x, y })
      this._getActiveBlock().currentPosition.setValue({ x: gestureState.moveX, y: gestureState.moveY })
    }
  }

  onMoveBlock = (evt, {moveX, moveY, dx, dy}) => {
    if (this.state.activeBlock != null && this._blockPositionsSet()) {
      if (this.state.deleteModeOn) return this.deleteModeMove({ x: moveX, y: moveY })

      if (dx != 0 || dy != 0) this.initialDragDone = true

      let yChokeAmount = Math.max(0, (this.activeBlockOffset.y + moveY) - (this.state.gridLayout.height - this.blockWidth))
      let xChokeAmount = Math.max(0, (this.activeBlockOffset.x + moveX) - (this.state.gridLayout.width - this.blockWidth))
      let yMinChokeAmount = Math.min(0, this.activeBlockOffset.y + moveY)
      let xMinChokeAmount = Math.min(0, this.activeBlockOffset.x + moveX)

      let dragPosition = { x: moveX - xChokeAmount - xMinChokeAmount, y: moveY - yChokeAmount - yMinChokeAmount }
      this.dragPosition = dragPosition
      let originalPosition = this._getActiveBlock().origin
      let distanceToOrigin = this._getDistanceTo(originalPosition)
      this._getActiveBlock().currentPosition.setValue(dragPosition)

      let closest = this.state.activeBlock
      let closestDistance = distanceToOrigin
      this.state.blockPositions.forEach( (block, index) => {
        if (index !== this.state.activeBlock && block.origin) {
          let blockPosition = block.origin
          let distance = this._getDistanceTo(blockPosition)

          if (distance < closestDistance && distance < this.state.blockWidth) {
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
          this._getBlock(closest).currentPosition,
          {
            toValue: this._getActiveBlock().origin,
            duration: this.blockTransitionDuration
          }
        ).start()
        let blockPositions = this.state.blockPositions
        this._getActiveBlock().origin = blockPositions[closest].origin
        blockPositions[closest].origin = originalPosition
        this.setState({ blockPositions })

        var tempOrderIndex = this.itemOrder[this.state.activeBlock].order
        this.itemOrder[this.state.activeBlock].order = this.itemOrder[closest].order
        this.itemOrder[closest].order = tempOrderIndex
      }
    }
  }

  onReleaseBlock = (evt, gestureState) => {
    this.returnBlockToOriginalPosition()
    if (this.state.deleteModeOn && this.state.deletionSwipePercent == 100)
      this.deleteBlock()
    else
      this.afterDragRelease()
  }

  deleteBlock = () => {
    this.setState({ deleteBlock: this.state.activeBlock })
    this.blockAnimateFadeOut()
    .then( () => {
      let activeBlock = this.state.activeBlock
      this.setState({ activeBlock: null, deleteBlock: null }, () => {
        this.onDeleteItem({ item: this.itemOrder[ activeBlock ] })
        this.deleteBlocks([ activeBlock ])
        this.afterDragRelease()
      })
    })
  }

  blockAnimateFadeOut = () => {
    this.state.deleteBlockOpacity.setValue(1)
    return new Promise( (resolve, reject) => {
      Animated.timing(
        this.state.deleteBlockOpacity,
        { toValue: 0, duration: 2 * this.activeBlockCenteringDuration }
      ).start(resolve)
    })
  }

  animateBlockMove = (blockIndex, position) => {
    Animated.timing(
      this._getBlock(blockIndex).currentPosition,
      {
        toValue: position,
        duration: this.blockTransitionDuration
      }
    ).start()
  }

  returnBlockToOriginalPosition = () => {
    let activeBlockCurrentPosition = this._getActiveBlock().currentPosition
    activeBlockCurrentPosition.flattenOffset()
    Animated.timing(
      activeBlockCurrentPosition,
      {
        toValue: this._getActiveBlock().origin,
        duration: this.activeBlockCenteringDuration
      }
    ).start()
  }

  afterDragRelease = () => {
    let itemOrder = _.sortBy( this.itemOrder, item => item.order )
    this.onDragRelease({ itemOrder })
    this.setState({ activeBlock: null })
    this.panCapture = false
  }

  deleteModeMove = ({x, y}) => {
    let slideDistance = 50
    let moveY = y + this.activeBlockOffset.y - this._getActiveBlock().origin.y
    let adjustY = 0
    if (moveY < 0) adjustY = moveY
    else if (moveY > slideDistance) adjustY = moveY - slideDistance
    let deletionSwipePercent = (moveY - adjustY) / slideDistance * 100
    this._getActiveBlock().currentPosition.y.setValue(y - adjustY)
    this.setState({deletionSwipePercent})
  }

  assessGridSize = ({nativeEvent}) => {
    this.blockWidth = nativeEvent.layout.width / this.itemsPerRow
    if (this.state.gridLayout != nativeEvent.layout) {
      this.setState({
        gridLayout: nativeEvent.layout,
        blockWidth: this.blockWidth
      })
    }
  }

  reAssessGridRows = () => {
    let oldRows = this.rows
    this.rows = Math.ceil(this.items.length / this.itemsPerRow)
    if (this.state.blockWidth && oldRows != this.rows) this._animateGridHeight()
  }

  saveBlockPositions = (key) => ({nativeEvent}) => {
    let blockPositions = this.state.blockPositions
    if (!blockPositions[key]) {
      let blockPositionsSetCount = blockPositions[key] ? this.state.blockPositionsSetCount : ++this.state.blockPositionsSetCount
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
        this.initialLayoutDone = true
      }
    }
  }

  getNextBlockCoordinates = () => {
    let blockWidth = this.state.blockWidth
    let placeOnRow = this.items.length % this.itemsPerRow
    let y = blockWidth * Math.floor(this.items.length / this.itemsPerRow)
    let x = placeOnRow * blockWidth
    return { x, y }
  }

  setGhostPositions = () => {
    this.ghostBlocks = []
    this.reAssessGridRows()
    let blockWidth = this.state.blockWidth
    let fullGridItemCount = this.rows * this.itemsPerRow
    let ghostBlockCount = fullGridItemCount - this.items.length
    let y = blockWidth * (this.rows - 1)
    let initialX =  blockWidth * (this.itemsPerRow - ghostBlockCount)

    for (let i = 0; i < ghostBlockCount; ++i) {
      let x = initialX + blockWidth * i
      this.ghostBlocks.push({x, y})
    }
  }

  activateDrag = (key) => () => {
    this.panCapture = true
    this.onDragStart( this.itemOrder[key] )
    this.setState({ activeBlock: key })
    this._defaultDragActivationWiggle()
  }

  handleTap = ({ onTap = NULL_FN, onDoubleTap = NULL_FN }) => () => {
    if (this.tapIgnore) this._resetTapIgnoreTime()
    else if (onDoubleTap != null) {
      this.doubleTapWait ? this._onDoubleTap(onDoubleTap) : this._onSingleTap(onTap)
    } else onTap()
  }

  // Helpers & other boring stuff

  _getActiveBlock = () => this.state.blockPositions[ this.state.activeBlock ]

  _getBlock = (blockIndex) => this.state.blockPositions[ blockIndex ]

  _blockPositionsSet = () => this.state.blockPositionsSetCount === this.items.length

  _saveItemOrder = (items) => {
    items.forEach( (item, index) => {
      if (!_.findKey(this.itemOrder, (oldItem) => oldItem.key === item.key)) {
        this.itemOrder.push({ key: item.key, ref: item.ref, order: this.items.length })
        if (!this.initialLayoutDone) {
          this.items.push(item)
        }
        else {
          let blockPositions = this.state.blockPositions
          let blockPositionsSetCount = ++this.state.blockPositionsSetCount
          let thisPosition = this.getNextBlockCoordinates()
          blockPositions.push({
            currentPosition : new Animated.ValueXY( thisPosition ),
            origin          : thisPosition
          })
          this.items.push(item)
          this.setState({ blockPositions, blockPositionsSetCount })
          this.setGhostPositions()
        }
      }
    })
  }

  _removeDisappearedChildren = (items) => {
    let deleteBlockIndices = []
    _.cloneDeep(this.itemOrder).forEach( (item, index) => {
      if (!_.findKey(items, (oldItem) => oldItem.key === item.key)) {
        deleteBlockIndices.push(index)
      }
    })
    if (deleteBlockIndices.length > 0) {
      this.deleteBlocks(deleteBlockIndices)
    }
  }

  deleteBlocks = (deleteBlockIndices) => {
      let blockPositions = this.state.blockPositions
      let blockPositionsSetCount = this.state.blockPositionsSetCount
      _.sortBy(deleteBlockIndices, index => -index).forEach(index => {
        --blockPositionsSetCount
        let order = this.itemOrder[index].order
        blockPositions.splice(index, 1)
        this._fixItemOrderOnDeletion(this.itemOrder[index])
        this.itemOrder.splice(index, 1)
        this.items.splice(index, 1)
      })
      this.setState({ blockPositions, blockPositionsSetCount }, () => {
        this.items.forEach( (item, order) => {
          let blockIndex = _.findIndex(this.itemOrder, item => item.order === order)
          let x = (order * this.state.blockWidth) % (this.itemsPerRow * this.state.blockWidth)
          let y = Math.floor(order / this.itemsPerRow) * this.state.blockWidth
          this.state.blockPositions[blockIndex].origin = {x, y}
          this.animateBlockMove(blockIndex, {x, y})
        })
        this.setGhostPositions()
      })
  }

  _fixItemOrderOnDeletion = (orderItem) => {
    if (!orderItem) return false
    orderItem.order--
    this._fixItemOrderOnDeletion(_.find(this.itemOrder, item => item.order === orderItem.order + 2))
  }

  _animateGridHeight = () => {
    this.gridHeightTarget = this.rows * this.state.blockWidth
    if (this.gridHeightTarget === this.state.gridLayout.height || this.state.gridLayout.height === 0)
      this.state.gridHeight.setValue(this.gridHeightTarget)
    else if (this.state.gridHeight._value !== this.gridHeightTarget) {
      Animated.timing(
        this.state.gridHeight,
        {
          toValue: this.gridHeightTarget,
          duration: this.blockTransitionDuration
        }
      ).start()
    }
  }

  _getDistanceTo = (point) => {
    let xDistance = this.dragPosition.x + this.activeBlockOffset.x - point.x
    let yDistance = this.dragPosition.y + this.activeBlockOffset.y - point.y
    return Math.sqrt( Math.pow(xDistance, 2) + Math.pow(yDistance, 2) )
  }

  _defaultDragActivationWiggle = () => {
    if (!this.dragStartAnimation) {
      this.state.startDragWiggle.setValue(20)
      Animated.spring(this.state.startDragWiggle, {
        toValue: 0,
        velocity: 2000,
        tension: 2000,
        friction: 5
      }).start()
    }
  }

  _blockActivationWiggle = () => {
    return this.dragStartAnimation ||
    { transform: [{ rotate: this.state.startDragWiggle.interpolate({
      inputRange:  [0, 360],
      outputRange: ['0 deg', '360 deg']})}]}
  }

  _assignReceivedPropertiesIntoThis(properties) {
    Object.keys(properties).forEach(property => {
      if (this[property])
        this[property] = properties[property]
    })
    this.dragStartAnimation = properties.dragStartAnimation
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
      onMoveShouldSetPanResponder:         (evt, gestureState) => this.panCapture,
      onMoveShouldSetPanResponderCapture:  (evt, gestureState) => this.panCapture,
      onShouldBlockNativeResponder:        (evt, gestureState) => false,
      onPanResponderTerminationRequest:    (evt, gestureState) => false,
      onPanResponderGrant:   this.onActiveBlockIsSet(this.onStartDrag),
      onPanResponderMove:    this.onActiveBlockIsSet(this.onMoveBlock),
      onPanResponderRelease: this.onActiveBlockIsSet(this.onReleaseBlock)
    })

  onActiveBlockIsSet = (fn) => (evt, gestureState) => {
    if (this.state.activeBlock != null) fn(evt, gestureState)
  }

  // Style getters

  _getGridStyle = () => [
    styles.sortableGrid,
    this.props.style,
    this._blockPositionsSet() && { height: this.state.gridHeight }
  ]

  _getDeletionView = (key) => {
    if (this.state.deleteModeOn)
      return <Image style={ this._getImageDeleteIconStyle(key) } source={require('./assets/trash.png')} />
  }

  _getItemWrapperStyle = (key) => [
    { flex: 1 },
       this.state.activeBlock == key
    && this.state.deleteModeOn
    && this._getBlock( key ).origin
    &&
    { opacity: 1.5 - this._getDynamicOpacity(key) }
  ]

  _getImageDeleteIconStyle = (key) => [
    { position: 'absolute',
      top: this.state.blockWidth/2 - 15,
      left: this.state.blockWidth/2 - 15,
      width: 30,
      height: 30,
      opacity: .5
    },
    this.state.activeBlock == key
    && this._getBlock( key ).origin
    &&
    { opacity: .5 + this._getDynamicOpacity(key) }
  ]

  _getDynamicOpacity = (key) =>
    (   this._getBlock( key ).currentPosition.y._value
      + this._getBlock( key ).currentPosition.y._offset
      - this._getBlock( key ).origin.y
    ) / 50

  _getBlockStyle = (key) => [
    { width: this.state.blockWidth,
      height: this.state.blockWidth,
      justifyContent: 'center' },
    this._blockPositionsSet() && (this.initialDragDone || this.state.deleteModeOn) &&
    { position: 'absolute',
      top: this._getBlock(key).currentPosition.getLayout().top,
      left: this._getBlock(key).currentPosition.getLayout().left
    },
    this.state.activeBlock == key && this._blockActivationWiggle(),
    this.state.activeBlock == key && { zIndex: 1 },
    this.state.deleteBlock != null && { zIndex: 2 },
    this.state.deleteBlock == key && { opacity: this.state.deleteBlockOpacity },
    this.state.deletedItems.indexOf(key) !== -1 && styles.deletedBlock
  ]
}

const styles = StyleSheet.create(
{
  sortableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  deletedBlock: {
    opacity: 0,
    position: 'absolute',
    left: 0,
    top: 0,
    height: 0,
    width: 0
  },
  itemImageContainer: {
    flex: 1,
    justifyContent: 'center'
  }
})

module.exports = SortableGrid
