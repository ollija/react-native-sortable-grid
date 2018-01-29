'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactNative = require('react-native');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Default values
var ITEMS_PER_ROW = 4;
var DRAG_ACTIVATION_TRESHOLD = 200; // Milliseconds
var BLOCK_TRANSITION_DURATION = 300; // Milliseconds
var ACTIVE_BLOCK_CENTERING_DURATION = 200; // Milliseconds
var DOUBLETAP_TRESHOLD = 150; // Milliseconds
var NULL_FN = function NULL_FN() {};

var Block = function (_Component) {
  _inherits(Block, _Component);

  function Block() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, Block);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = Block.__proto__ || Object.getPrototypeOf(Block)).call.apply(_ref, [this].concat(args))), _this), _this.render = function () {
      return _react2.default.createElement(
        _reactNative.Animated.View,
        _extends({
          style: _this.props.style,
          onLayout: _this.props.onLayout
        }, _this.props.panHandlers),
        _react2.default.createElement(
          _reactNative.TouchableWithoutFeedback,
          {
            style: { flex: 1 },
            delayLongPress: _this.props.delayLongPress,
            onLongPress: function onLongPress() {
              return _this.props.inactive || _this.props.onLongPress();
            },
            onPress: function onPress() {
              return _this.props.inactive || _this.props.onPress();
            } },
          _react2.default.createElement(
            _reactNative.View,
            { style: styles.itemImageContainer },
            _react2.default.createElement(
              _reactNative.View,
              { style: _this.props.itemWrapperStyle },
              _this.props.children
            ),
            _this.props.deletionView
          )
        )
      );
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  return Block;
}(_react.Component);

var SortableGrid = function (_Component2) {
  _inherits(SortableGrid, _Component2);

  function SortableGrid() {
    _classCallCheck(this, SortableGrid);

    var _this2 = _possibleConstructorReturn(this, (SortableGrid.__proto__ || Object.getPrototypeOf(SortableGrid)).call(this));

    _this2.render = function () {
      return _react2.default.createElement(
        _reactNative.Animated.View,
        {
          style: _this2._getGridStyle(),
          onLayout: _this2.assessGridSize
        },
        _this2.state.gridLayout && _this2.items.map(function (item, key) {
          return _react2.default.createElement(
            Block,
            {
              key: key,
              style: _this2._getBlockStyle(key),
              onLayout: _this2.saveBlockPositions(key),
              panHandlers: _this2._panResponder.panHandlers,
              delayLongPress: _this2.dragActivationTreshold,
              onLongPress: _this2.activateDrag(key),
              onPress: _this2.handleTap(item.props),
              itemWrapperStyle: _this2._getItemWrapperStyle(key),
              deletionView: _this2._getDeletionView(key),
              inactive: item.props.inactive
            },
            item
          );
        })
      );
    };

    _this2.toggleDeleteMode = function () {
      var deleteModeOn = !_this2.state.deleteModeOn;
      _this2.setState({ deleteModeOn: deleteModeOn });
      return { deleteModeOn: deleteModeOn };
    };

    _this2.componentWillMount = function () {
      return _this2.createTouchHandlers();
    };

    _this2.componentDidMount = function () {
      return _this2.handleNewProps(_this2.props);
    };

    _this2.componentWillUnmount = function () {
      if (_this2.tapTimer) clearTimeout(_this2.tapTimer);
    };

    _this2.componentWillReceiveProps = function (properties) {
      return _this2.handleNewProps(properties);
    };

    _this2.handleNewProps = function (properties) {
      _this2._assignReceivedPropertiesIntoThis(properties);
      _this2._saveItemOrder(properties.children);
      _this2._removeDisappearedChildren(properties.children);
    };

    _this2.onStartDrag = function (evt, gestureState) {
      if (_this2.state.activeBlock != null) {
        var activeBlockPosition = _this2._getActiveBlock().origin;
        var x = activeBlockPosition.x - gestureState.x0;
        var y = activeBlockPosition.y - gestureState.y0;
        _this2.activeBlockOffset = { x: x, y: y };
        _this2._getActiveBlock().currentPosition.setOffset({ x: x, y: y });
        _this2._getActiveBlock().currentPosition.setValue({ x: gestureState.moveX, y: gestureState.moveY });
      }
    };

    _this2.onMoveBlock = function (evt, _ref2) {
      var moveX = _ref2.moveX,
          moveY = _ref2.moveY,
          dx = _ref2.dx,
          dy = _ref2.dy;

      if (_this2.state.activeBlock != null && _this2._blockPositionsSet()) {
        if (_this2.state.deleteModeOn) return _this2.deleteModeMove({ x: moveX, y: moveY });

        if (dx != 0 || dy != 0) _this2.initialDragDone = true;

        var yChokeAmount = Math.max(0, _this2.activeBlockOffset.y + moveY - (_this2.state.gridLayout.height - _this2.blockHeight));
        var xChokeAmount = Math.max(0, _this2.activeBlockOffset.x + moveX - (_this2.state.gridLayout.width - _this2.blockWidth));
        var yMinChokeAmount = Math.min(0, _this2.activeBlockOffset.y + moveY);
        var xMinChokeAmount = Math.min(0, _this2.activeBlockOffset.x + moveX);

        var dragPosition = { x: moveX - xChokeAmount - xMinChokeAmount, y: moveY - yChokeAmount - yMinChokeAmount };
        _this2.dragPosition = dragPosition;
        var originalPosition = _this2._getActiveBlock().origin;
        var distanceToOrigin = _this2._getDistanceTo(originalPosition);
        _this2._getActiveBlock().currentPosition.setValue(dragPosition);

        var closest = _this2.state.activeBlock;
        var closestDistance = distanceToOrigin;
        _this2.state.blockPositions.forEach(function (block, index) {
          if (index !== _this2.state.activeBlock && block.origin) {
            var blockPosition = block.origin;
            var distance = _this2._getDistanceTo(blockPosition);

            if (distance < closestDistance && distance < _this2.state.blockWidth) {
              closest = index;
              closestDistance = distance;
            }
          }
        });

        _this2.ghostBlocks.forEach(function (ghostBlockPosition) {
          var distance = _this2._getDistanceTo(ghostBlockPosition);
          if (distance < closestDistance) {
            closest = _this2.state.activeBlock;
            closestDistance = distance;
          }
        });
        if (closest !== _this2.state.activeBlock) {
          _reactNative.Animated.timing(_this2._getBlock(closest).currentPosition, {
            toValue: _this2._getActiveBlock().origin,
            duration: _this2.blockTransitionDuration
          }).start();
          var blockPositions = _this2.state.blockPositions;
          _this2._getActiveBlock().origin = blockPositions[closest].origin;
          blockPositions[closest].origin = originalPosition;
          _this2.setState({ blockPositions: blockPositions });

          var tempOrderIndex = _this2.itemOrder[_this2.state.activeBlock].order;
          _this2.itemOrder[_this2.state.activeBlock].order = _this2.itemOrder[closest].order;
          _this2.itemOrder[closest].order = tempOrderIndex;
        }
      }
    };

    _this2.onReleaseBlock = function (evt, gestureState) {
      _this2.returnBlockToOriginalPosition();
      if (_this2.state.deleteModeOn && _this2.state.deletionSwipePercent == 100) _this2.deleteBlock();else _this2.afterDragRelease();
    };

    _this2.deleteBlock = function () {
      _this2.setState({ deleteBlock: _this2.state.activeBlock });
      _this2.blockAnimateFadeOut().then(function () {
        var activeBlock = _this2.state.activeBlock;
        _this2.setState({ activeBlock: null, deleteBlock: null }, function () {
          _this2.onDeleteItem({ item: _this2.itemOrder[activeBlock] });
          _this2.deleteBlocks([activeBlock]);
          _this2.afterDragRelease();
        });
      });
    };

    _this2.blockAnimateFadeOut = function () {
      _this2.state.deleteBlockOpacity.setValue(1);
      return new Promise(function (resolve, reject) {
        _reactNative.Animated.timing(_this2.state.deleteBlockOpacity, { toValue: 0, duration: 2 * _this2.activeBlockCenteringDuration }).start(resolve);
      });
    };

    _this2.animateBlockMove = function (blockIndex, position) {
      _reactNative.Animated.timing(_this2._getBlock(blockIndex).currentPosition, {
        toValue: position,
        duration: _this2.blockTransitionDuration
      }).start();
    };

    _this2.returnBlockToOriginalPosition = function () {
      var activeBlockCurrentPosition = _this2._getActiveBlock().currentPosition;
      activeBlockCurrentPosition.flattenOffset();
      _reactNative.Animated.timing(activeBlockCurrentPosition, {
        toValue: _this2._getActiveBlock().origin,
        duration: _this2.activeBlockCenteringDuration
      }).start();
    };

    _this2.afterDragRelease = function () {
      var itemOrder = _lodash2.default.sortBy(_this2.itemOrder, function (item) {
        return item.order;
      });
      _this2.onDragRelease({ itemOrder: itemOrder });
      _this2.setState({ activeBlock: null });
      _this2.panCapture = false;
    };

    _this2.deleteModeMove = function (_ref3) {
      var x = _ref3.x,
          y = _ref3.y;

      var slideDistance = 50;
      var moveY = y + _this2.activeBlockOffset.y - _this2._getActiveBlock().origin.y;
      var adjustY = 0;
      if (moveY < 0) adjustY = moveY;else if (moveY > slideDistance) adjustY = moveY - slideDistance;
      var deletionSwipePercent = (moveY - adjustY) / slideDistance * 100;
      _this2._getActiveBlock().currentPosition.y.setValue(y - adjustY);
      _this2.setState({ deletionSwipePercent: deletionSwipePercent });
    };

    _this2.assessGridSize = function (_ref4) {
      var nativeEvent = _ref4.nativeEvent;

      console.log("Calculating grid size");
      if (_this2.props.itemWidth && _this2.props.itemWidth < nativeEvent.layout.width) {
        _this2.itemsPerRow = Math.floor(nativeEvent.layout.width / _this2.props.itemWidth);
        _this2.blockWidth = nativeEvent.layout.width / _this2.itemsPerRow;
        _this2.blockHeight = _this2.props.itemHeight || _this2.blockWidth;
      } else {
        _this2.blockWidth = nativeEvent.layout.width / _this2.itemsPerRow;
        _this2.blockHeight = _this2.blockWidth;
      }
      if (_this2.state.gridLayout != nativeEvent.layout) {
        _this2.setState({
          gridLayout: nativeEvent.layout,
          blockWidth: _this2.blockWidth,
          blockHeight: _this2.blockHeight
        });
      }
    };

    _this2.reAssessGridRows = function () {
      var oldRows = _this2.rows;
      _this2.rows = Math.ceil(_this2.items.length / _this2.itemsPerRow);
      if (_this2.state.blockWidth && oldRows != _this2.rows) _this2._animateGridHeight();
    };

    _this2.saveBlockPositions = function (key) {
      return function (_ref5) {
        var nativeEvent = _ref5.nativeEvent;

        var blockPositions = _this2.state.blockPositions;
        if (!blockPositions[key]) {
          var blockPositionsSetCount = blockPositions[key] ? _this2.state.blockPositionsSetCount : ++_this2.state.blockPositionsSetCount;
          var thisPosition = {
            x: nativeEvent.layout.x,
            y: nativeEvent.layout.y
          };

          blockPositions[key] = {
            currentPosition: new _reactNative.Animated.ValueXY(thisPosition),
            origin: thisPosition
          };
          _this2.setState({ blockPositions: blockPositions, blockPositionsSetCount: blockPositionsSetCount });

          if (_this2._blockPositionsSet()) {
            _this2.setGhostPositions();
            _this2.initialLayoutDone = true;
          }
        }
      };
    };

    _this2.getNextBlockCoordinates = function () {
      var blockWidth = _this2.state.blockWidth;
      var blockHeight = _this2.state.blockHeight;
      var placeOnRow = _this2.items.length % _this2.itemsPerRow;
      var y = blockHeight * Math.floor(_this2.items.length / _this2.itemsPerRow);
      var x = placeOnRow * blockWidth;
      return { x: x, y: y };
    };

    _this2.setGhostPositions = function () {
      _this2.ghostBlocks = [];
      _this2.reAssessGridRows();
      var blockWidth = _this2.state.blockWidth;
      var blockHeight = _this2.state.blockHeight;
      var fullGridItemCount = _this2.rows * _this2.itemsPerRow;
      var ghostBlockCount = fullGridItemCount - _this2.items.length;
      var y = blockHeight * (_this2.rows - 1);
      var initialX = blockWidth * (_this2.itemsPerRow - ghostBlockCount);

      for (var i = 0; i < ghostBlockCount; ++i) {
        var x = initialX + blockWidth * i;
        _this2.ghostBlocks.push({ x: x, y: y });
      }
    };

    _this2.activateDrag = function (key) {
      return function () {
        _this2.panCapture = true;
        _this2.onDragStart(_this2.itemOrder[key]);
        _this2.setState({ activeBlock: key });
        _this2._defaultDragActivationWiggle();
      };
    };

    _this2.handleTap = function (_ref6) {
      var _ref6$onTap = _ref6.onTap,
          onTap = _ref6$onTap === undefined ? NULL_FN : _ref6$onTap,
          _ref6$onDoubleTap = _ref6.onDoubleTap,
          onDoubleTap = _ref6$onDoubleTap === undefined ? NULL_FN : _ref6$onDoubleTap;
      return function () {
        if (_this2.tapIgnore) _this2._resetTapIgnoreTime();else if (onDoubleTap != null) {
          _this2.doubleTapWait ? _this2._onDoubleTap(onDoubleTap) : _this2._onSingleTap(onTap);
        } else onTap();
      };
    };

    _this2._getActiveBlock = function () {
      return _this2.state.blockPositions[_this2.state.activeBlock];
    };

    _this2._getBlock = function (blockIndex) {
      return _this2.state.blockPositions[blockIndex];
    };

    _this2._blockPositionsSet = function () {
      return _this2.state.blockPositionsSetCount === _this2.items.length;
    };

    _this2._saveItemOrder = function (items) {
      items.forEach(function (item, index) {
        var foundKey = _lodash2.default.findKey(_this2.itemOrder, function (oldItem) {
          return oldItem.key === item.key;
        });

        if (foundKey) {
          _this2.items[foundKey] = item;
        } else {
          _this2.itemOrder.push({ key: item.key, ref: item.ref, order: _this2.items.length });
          if (!_this2.initialLayoutDone) {
            _this2.items.push(item);
          } else {
            var blockPositions = _this2.state.blockPositions;
            var blockPositionsSetCount = ++_this2.state.blockPositionsSetCount;
            var thisPosition = _this2.getNextBlockCoordinates();
            blockPositions.push({
              currentPosition: new _reactNative.Animated.ValueXY(thisPosition),
              origin: thisPosition
            });
            _this2.items.push(item);
            _this2.setState({ blockPositions: blockPositions, blockPositionsSetCount: blockPositionsSetCount });
            _this2.setGhostPositions();
          }
        }
      });
    };

    _this2._removeDisappearedChildren = function (items) {
      var deleteBlockIndices = [];
      _lodash2.default.cloneDeep(_this2.itemOrder).forEach(function (item, index) {
        if (!_lodash2.default.findKey(items, function (oldItem) {
          return oldItem.key === item.key;
        })) {
          deleteBlockIndices.push(index);
        }
      });
      if (deleteBlockIndices.length > 0) {
        _this2.deleteBlocks(deleteBlockIndices);
      }
    };

    _this2.deleteBlocks = function (deleteBlockIndices) {
      var blockPositions = _this2.state.blockPositions;
      var blockPositionsSetCount = _this2.state.blockPositionsSetCount;
      _lodash2.default.sortBy(deleteBlockIndices, function (index) {
        return -index;
      }).forEach(function (index) {
        --blockPositionsSetCount;
        var order = _this2.itemOrder[index].order;
        blockPositions.splice(index, 1);
        _this2._fixItemOrderOnDeletion(_this2.itemOrder[index]);
        _this2.itemOrder.splice(index, 1);
        _this2.items.splice(index, 1);
      });
      _this2.setState({ blockPositions: blockPositions, blockPositionsSetCount: blockPositionsSetCount }, function () {
        _this2.items.forEach(function (item, order) {
          var blockIndex = _lodash2.default.findIndex(_this2.itemOrder, function (item) {
            return item.order === order;
          });
          var x = order * _this2.state.blockWidth % (_this2.itemsPerRow * _this2.state.blockWidth);
          var y = Math.floor(order / _this2.itemsPerRow) * _this2.state.blockHeight;
          _this2.state.blockPositions[blockIndex].origin = { x: x, y: y };
          _this2.animateBlockMove(blockIndex, { x: x, y: y });
        });
        _this2.setGhostPositions();
      });
    };

    _this2._fixItemOrderOnDeletion = function (orderItem) {
      if (!orderItem) return false;
      orderItem.order--;
      _this2._fixItemOrderOnDeletion(_lodash2.default.find(_this2.itemOrder, function (item) {
        return item.order === orderItem.order + 2;
      }));
    };

    _this2._animateGridHeight = function () {
      _this2.gridHeightTarget = _this2.rows * _this2.state.blockHeight;
      if (_this2.gridHeightTarget === _this2.state.gridLayout.height || _this2.state.gridLayout.height === 0) _this2.state.gridHeight.setValue(_this2.gridHeightTarget);else if (_this2.state.gridHeight._value !== _this2.gridHeightTarget) {
        _reactNative.Animated.timing(_this2.state.gridHeight, {
          toValue: _this2.gridHeightTarget,
          duration: _this2.blockTransitionDuration
        }).start();
      }
    };

    _this2._getDistanceTo = function (point) {
      var xDistance = _this2.dragPosition.x + _this2.activeBlockOffset.x - point.x;
      var yDistance = _this2.dragPosition.y + _this2.activeBlockOffset.y - point.y;
      return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
    };

    _this2._defaultDragActivationWiggle = function () {
      if (!_this2.dragStartAnimation) {
        _this2.state.startDragWiggle.setValue(20);
        _reactNative.Animated.spring(_this2.state.startDragWiggle, {
          toValue: 0,
          velocity: 2000,
          tension: 2000,
          friction: 5
        }).start();
      }
    };

    _this2._blockActivationWiggle = function () {
      return _this2.dragStartAnimation || { transform: [{ rotate: _this2.state.startDragWiggle.interpolate({
            inputRange: [0, 360],
            outputRange: ['0 deg', '360 deg'] }) }] };
    };

    _this2._onSingleTap = function (onTap) {
      _this2.doubleTapWait = true;
      _this2.tapTimer = setTimeout(function () {
        _this2.doubleTapWait = false;
        onTap();
      }, _this2.doubleTapTreshold);
    };

    _this2._onDoubleTap = function (onDoubleTap) {
      _this2._resetTapIgnoreTime();
      _this2.doubleTapWait = false;
      _this2.tapIgnore = true;
      onDoubleTap();
    };

    _this2._resetTapIgnoreTime = function () {
      clearTimeout(_this2.tapTimer);
      _this2.tapTimer = setTimeout(function () {
        return _this2.tapIgnore = false;
      }, _this2.doubleTapTreshold);
    };

    _this2.createTouchHandlers = function () {
      return _this2._panResponder = _reactNative.PanResponder.create({
        onPanResponderTerminate: function onPanResponderTerminate(evt, gestureState) {},
        onStartShouldSetPanResponder: function onStartShouldSetPanResponder(evt, gestureState) {
          return true;
        },
        onStartShouldSetPanResponderCapture: function onStartShouldSetPanResponderCapture(evt, gestureState) {
          return false;
        },
        onMoveShouldSetPanResponder: function onMoveShouldSetPanResponder(evt, gestureState) {
          return _this2.panCapture;
        },
        onMoveShouldSetPanResponderCapture: function onMoveShouldSetPanResponderCapture(evt, gestureState) {
          return _this2.panCapture;
        },
        onShouldBlockNativeResponder: function onShouldBlockNativeResponder(evt, gestureState) {
          return false;
        },
        onPanResponderTerminationRequest: function onPanResponderTerminationRequest(evt, gestureState) {
          return false;
        },
        onPanResponderGrant: _this2.onActiveBlockIsSet(_this2.onStartDrag),
        onPanResponderMove: _this2.onActiveBlockIsSet(_this2.onMoveBlock),
        onPanResponderRelease: _this2.onActiveBlockIsSet(_this2.onReleaseBlock)
      });
    };

    _this2.onActiveBlockIsSet = function (fn) {
      return function (evt, gestureState) {
        if (_this2.state.activeBlock != null) fn(evt, gestureState);
      };
    };

    _this2._getGridStyle = function () {
      return [styles.sortableGrid, _this2.props.style, _this2._blockPositionsSet() && { height: _this2.state.gridHeight }];
    };

    _this2._getDeletionView = function (key) {
      if (_this2.state.deleteModeOn) return _react2.default.createElement(_reactNative.Image, { style: _this2._getImageDeleteIconStyle(key), source: require('../assets/trash.png') });
    };

    _this2._getItemWrapperStyle = function (key) {
      return [{ flex: 1 }, _this2.state.activeBlock == key && _this2.state.deleteModeOn && _this2._getBlock(key).origin && { opacity: 1.5 - _this2._getDynamicOpacity(key) }];
    };

    _this2._getImageDeleteIconStyle = function (key) {
      return [{ position: 'absolute',
        top: _this2.state.blockHeight / 2 - 15,
        left: _this2.state.blockWidth / 2 - 15,
        width: 30,
        height: 30,
        opacity: .5
      }, _this2.state.activeBlock == key && _this2._getBlock(key).origin && { opacity: .5 + _this2._getDynamicOpacity(key) }];
    };

    _this2._getDynamicOpacity = function (key) {
      return (_this2._getBlock(key).currentPosition.y._value + _this2._getBlock(key).currentPosition.y._offset - _this2._getBlock(key).origin.y) / 50;
    };

    _this2._getBlockStyle = function (key) {
      return [{ width: _this2.state.blockWidth,
        height: _this2.state.blockHeight,
        justifyContent: 'center' }, _this2._blockPositionsSet() && (_this2.initialDragDone || _this2.state.deleteModeOn) && { position: 'absolute',
        top: _this2._getBlock(key).currentPosition.getLayout().top,
        left: _this2._getBlock(key).currentPosition.getLayout().left
      }, _this2.state.activeBlock == key && _this2._blockActivationWiggle(), _this2.state.activeBlock == key && { zIndex: 1 }, _this2.state.deleteBlock != null && { zIndex: 2 }, _this2.state.deleteBlock == key && { opacity: _this2.state.deleteBlockOpacity }, _this2.state.deletedItems.indexOf(key) !== -1 && styles.deletedBlock];
    };

    _this2.blockTransitionDuration = BLOCK_TRANSITION_DURATION;
    _this2.activeBlockCenteringDuration = ACTIVE_BLOCK_CENTERING_DURATION;
    _this2.itemsPerRow = ITEMS_PER_ROW;
    _this2.dragActivationTreshold = DRAG_ACTIVATION_TRESHOLD;
    _this2.doubleTapTreshold = DOUBLETAP_TRESHOLD;
    _this2.onDragRelease = NULL_FN;
    _this2.onDragStart = NULL_FN;
    _this2.onDeleteItem = NULL_FN;
    _this2.dragStartAnimation = null;

    _this2.rows = null;
    _this2.dragPosition = null;
    _this2.activeBlockOffset = null;
    _this2.blockWidth = null;
    _this2.blockHeight = null;
    _this2.itemWidth = null;
    _this2.itemHeight = null;
    _this2.gridHeightTarget = null;
    _this2.ghostBlocks = [];
    _this2.itemOrder = [];
    _this2.panCapture = false;
    _this2.items = [];
    _this2.initialLayoutDone = false;
    _this2.initialDragDone = false;

    _this2.tapTimer = null;
    _this2.tapIgnore = false;
    _this2.doubleTapWait = false;

    _this2.state = {
      gridLayout: null,
      blockPositions: [],
      startDragWiggle: new _reactNative.Animated.Value(0),
      activeBlock: null,
      blockWidth: null,
      blockHeight: null,
      gridHeight: new _reactNative.Animated.Value(0),
      blockPositionsSetCount: 0,
      deleteModeOn: false,
      deletionSwipePercent: 0,
      deleteBlock: null,
      deleteBlockOpacity: new _reactNative.Animated.Value(1),
      deletedItems: []
    };
    return _this2;
  }

  // Helpers & other boring stuff

  _createClass(SortableGrid, [{
    key: '_assignReceivedPropertiesIntoThis',
    value: function _assignReceivedPropertiesIntoThis(properties) {
      var _this3 = this;

      Object.keys(properties).forEach(function (property) {
        if (_this3[property]) _this3[property] = properties[property];
      });
      this.dragStartAnimation = properties.dragStartAnimation;
    }

    // Style getters

  }]);

  return SortableGrid;
}(_react.Component);

var styles = _reactNative.StyleSheet.create({
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
});

module.exports = SortableGrid;