import React from 'react';
import PropTypes from 'prop-types';
import { Client } from '@stomp/stompjs';

class Chat extends React.Component {
  static defaultProps = {
    onConnect: () => { },
    onDisconnect: () => { },
    options: {},
    headers: {},
    subscribeHeaders: {},
    autoReconnect: true,
    heartbeat: 10000
  }

  static propTypes = {
    url: PropTypes.string.isRequired,
    /**
     * Additional options to pass to the underlying SockJS constructor.
     *
     * @see [SockJS-options](https://github.com/sockjs/sockjs-client#sockjs-client-api)
     */
    options: PropTypes.object,
    topics: PropTypes.array.isRequired,
    onConnect: PropTypes.func,
    onDisconnect: PropTypes.func,
    /**
     * Callback when a message is recieved.
     *
     * @param {(string|Object)} msg message received from server, if JSON format then object
     * @param {string} topic the topic on which the message was received
     */
    onMessage: PropTypes.func.isRequired,
    headers: PropTypes.object,
    subscribeHeaders: PropTypes.object,
    autoReconnect: PropTypes.bool,
    heartbeat: PropTypes.number,
    heartbeatIncoming: PropTypes.number,
    heartbeatOutgoing: PropTypes.number,
    onConnectFailure: PropTypes.func
  }


  constructor(props) {
    super(props)

    this.state = {
      connected: false,
      explicitDisconnect: false
    }

    this.subscriptions = [];
  }

  componentDidMount() {
    console.log(this.props);
    this.connectToServer()
    console.log(this.state.connected);
  }

  componentWillUnmount() {
    this.disconnect()
  }

  shouldComponentUpdate(nextProps, nextState) {
    return false
  }

  componentDidUpdate(nextProps) {
    console.log(nextProps);
    if (this.state.connected) {
      // Subscribe to new topics
      // difference(nextProps.topics, this.props.topics)
      //   .forEach((newTopic) => {
      //     this.subscribeTopic(newTopic)
      //   })

      // // Unsubscribe from old topics
      // difference(this.props.topics, nextProps.topics)
      //   .forEach((oldTopic) => {
      //     this.unsubscribeFromTopic(oldTopic)
      //   })
    }
  }

  render() {
    return null
  }

  initStompClient = () => {
    // Websocket held by stompjs can be opened only once
    //this.client = Stomp.over(new SockJS(this.props.url, null, this.props.options))
    this.client = new Client();

    this.client.configure({
      brokerURL: this.props.url
    });

    this.client.activate();
    console.log(this.client);
    console.log(this.props);


    this.client.heartbeatIncoming = this.props.heartbeat
    this.client.heartbeatOutgoing = this.props.heartbeat

    if (Object.keys(this.props).includes('heartbeatIncoming')) {
      this.client.heartbeatIncoming = this.props.heartbeatIncoming
    }
    if (Object.keys(this.props).includes('heartbeatOutgoing')) {
      this.client.heartbeatOutgoing = this.props.heartbeatOutgoing
    }
  }

  cleanUp = () => {
    this.setState({ connected: false })
    this.subscriptions.clear()
  }

  subscribeTopic = (topic) => {
    console.log(this.subscriptions);
    console.log(!this.subscriptions.includes(topic));
    if (!this.subscriptions.includes(topic)) {
      let sub = this.client.subscribe(topic, (msg) => {
        this.props.onMessage(this.processMessage(msg.body), msg.headers.destination)
      }, this.props.subscribeHeaders)
      console.log(topic, sub);
      //this.subscriptions.set(topic, sub)
    }
  }

  processMessage = (msgBody) => {
    try {
      return JSON.parse(msgBody)
    } catch (e) {
      return msgBody
    }
  }

  unsubscribeFromTopic = (topic) => {
    let sub = this.subscriptions.get(topic)
    sub.unsubscribe()
    this.subscriptions.delete(topic)
  }
  connectCallBack(frame) {
    console.log(frame);
    this.setState({ connected: true })
  }
  errorCallback(error) {
    console.log(error);
  }

  connectToServer = () => {
    this.initStompClient()
    this.client.onConnect = (frame) => {

      console.log('connected', frame);
      this.setState({ connected: true })
      this.props.topics.forEach((topic) => {
        this.subscribeTopic(topic)
      })
      this.props.onConnect()

      //  let idRandom = Math.random();
      //  console.log(idRandom);
      //  var subscription = this.client.subscribe('/topic/public', this.addMessage, { id: idRandom });
    };

    this.client.onStompError = (frame) => {
      console.log(frame);
      if (Object.keys(frame.body).includes('onConnectFailure')) {
        this.props.onConnectFailure(frame.headers['message'])
      } else {
        console.log(frame)
      }
      console.log('Broker reported error: ' + frame.headers['message']);
      console.log('Additional details: ' + frame.body);
    };
    if (this.state.connected) {
          this.cleanUp()
          // onDisconnect should be called only once per connect
          this.props.onDisconnect()
        }
        if (this.props.autoReconnect && !this.state.explicitDisconnect) {
          //retry?
        }
    console.log(this.state.connected);
  }

  /**
   * Connect to the server if not connected. Under normal circumstances component
   * will automatically try to connect to server. This method is mostly useful
   * after component is explicitly disconnected via {@link SockJsClient#disconnect}.
   *
   * @public
   */
  connect = () => {
    this.setState({ explicitDisconnect: false })
    if (!this.state.connected) {
      this.connectToServer()
    }
  }

  /**
   * Disconnect STOMP client and disable all reconnect.
   *
   * @public
   */
  disconnect = () => {
    // On calling disconnect explicitly no effort will be made to reconnect
    this.setState({ explicitDisconnect: true })
    if (this.state.connected) {
      this.subscriptions.forEach((subid, topic) => {
        this.unsubscribeFromTopic(topic)
      })
      this.client.deactivate(() => {
        this.cleanUp()
        this.props.onDisconnect()
      })
    }
  }

  /**
   * Send message to the specified topic.
   *
   * @param {string} topic target topic to send message
   * @param {string} msg message to send
   * @param {Object} [opt_headers={}] additional headers for underlying STOMP client
   * @public
   */
  sendMessage = (topic, msg, opt_headers = {}) => {
    if (this.state.connected) {
      this.client.publish({destination: topic, headers: opt_headers,body: msg})
    } else {
      throw new Error('Send error: Chat is disconnected')
    }
  }
}

export default Chat