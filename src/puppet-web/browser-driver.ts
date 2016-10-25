/**
 * Wechat for Bot. Connecting ChatBots
 *
 * BrowserDriver
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import {
    Builder
  , Capabilities
  , WebDriver
}               from 'selenium-webdriver'

import {
    Config
  , HeadName
}               from '../config'
import log      from '../brolog-env'

export class BrowserDriver {
  private driver: WebDriver

  constructor(private head: HeadName) {
    log.verbose('PuppetWebBrowserDriver', 'constructor(%s)', head)
  }

  public async init(): Promise<this> {
    log.verbose('PuppetWebBrowser', 'initDriver() for head: %s', this.head)

    if (this.driver) {
      await this.driver.close()
      await this.driver.quit()
    }

    const head = this.head

    switch (true) {
      case !head: // no head default to phantomjs
      case /phantomjs/i.test(head):
      case /phantom/i.test(head):
        this.driver = this.getPhantomJsDriver()
        break

      case /firefox/i.test(head):
        this.driver = new Builder()
                            .setAlertBehavior('ignore')
                            .forBrowser('firefox')
                            .build()
        break

      case /chrome/i.test(head):
        this.driver = this.getChromeDriver()
        break

      default: // unsupported browser head
        throw new Error('unsupported head: ' + head)
    }

    this.driver.manage()
                .timeouts()
                .setScriptTimeout(10000)

    return this
  }

  private getChromeDriver(): WebDriver {
    log.verbose('PuppetWebBrowser', 'getChromeDriver()')

    /**
     * http://stackoverflow.com/a/27733960/1123955
     * issue #56
     * only need under win32 with cygwin
     * and will cause strange error:
     * `The previously configured ChromeDriver service is still running. You must shut it down before you may adjust its configuration.`

    const chrome = require('selenium-webdriver/chrome')
    const path = require('chromedriver').path

    const service = new chrome.ServiceBuilder(path).build()
    chrome.setDefaultService(service)

     */

    const options = {
      args: ['--no-sandbox']  // issue #26 for run inside docker
      // , binary: require('chromedriver').path
    }
    if (Config.isDocker) {
      options['binary'] = Config.CMD_CHROMIUM
    }

    const customChrome = Capabilities.chrome()
                                    .set('chromeOptions', options)

    return new Builder()
                .setAlertBehavior('ignore')
                .forBrowser('chrome')
                .withCapabilities(customChrome)
                .build()
  }

  private getPhantomJsDriver(): WebDriver {
    // setup custom phantomJS capability https://github.com/SeleniumHQ/selenium/issues/2069
    const phantomjsExe = require('phantomjs-prebuilt').path
    if (!phantomjsExe) {
      throw new Error('phantomjs binary path not found')
    }
    // const phantomjsExe = require('phantomjs2').path

    const phantomjsArgs = [
      '--load-images=false'
      , '--ignore-ssl-errors=true'  // this help socket.io connect with localhost
      , '--web-security=false'      // https://github.com/ariya/phantomjs/issues/12440#issuecomment-52155299
      , '--ssl-protocol=any'        // http://stackoverflow.com/a/26503588/1123955
      // , '--ssl-protocol=TLSv1'    // https://github.com/ariya/phantomjs/issues/11239#issuecomment-42362211

      // issue: Secure WebSocket(wss) do not work with Self Signed Certificate in PhantomJS #12
      // , '--ssl-certificates-path=D:\\cygwin64\\home\\zixia\\git\\wechaty' // http://stackoverflow.com/a/32690349/1123955
      // , '--ssl-client-certificate-file=cert.pem' //
    ]

    if (Config.debug) {
      phantomjsArgs.push('--remote-debugger-port=8080') // XXX: be careful when in production env.
      phantomjsArgs.push('--webdriver-loglevel=DEBUG')
      // phantomjsArgs.push('--webdriver-logfile=webdriver.debug.log')
    } else {
      if (log && log.level() === 'silent') {
        phantomjsArgs.push('--webdriver-loglevel=NONE')
      } else {
        phantomjsArgs.push('--webdriver-loglevel=ERROR')
      }
    }

    const customPhantom = Capabilities.phantomjs()
                                      .setAlertBehavior('ignore')
                                      .set('phantomjs.binary.path', phantomjsExe)
                                      .set('phantomjs.cli.args', phantomjsArgs)

    log.silly('PuppetWebBrowser', 'phantomjs binary: ' + phantomjsExe)
    log.silly('PuppetWebBrowser', 'phantomjs args: ' + phantomjsArgs.join(' '))

    const driver = new Builder()
                        .withCapabilities(customPhantom)
                        .build()

    /* tslint:disable:jsdoc-format */
		/**
		 *  FIXME: ISSUE #21 - https://github.com/zixia/wechaty/issues/21
	 	 *
 	 	 *	http://phantomjs.org/api/webpage/handler/on-resource-requested.html
		 *	http://stackoverflow.com/a/29544970/1123955
		 *  https://github.com/geeeeeeeeek/electronic-wechat/pull/319
		 *
		 */
    //   	driver.executePhantomJS(`
    // this.onResourceRequested = function(request, net) {
    //    console.log('REQUEST ' + request.url);
    //    blockRe = /wx\.qq\.com\/\?t=v2\/fake/i
    //    if (blockRe.test(request.url)) {
    //        console.log('Abort ' + request.url);
    //        net.abort();
    //    }
    // }
    // `)

    // https://github.com/detro/ghostdriver/blob/f976007a431e634a3ca981eea743a2686ebed38e/src/session.js#L233
    // driver.manage().timeouts().pageLoadTimeout(2000)

    return driver
  }

  // public driver1(): WebDriver
  // public driver1(empty: null): void
  // public driver1(newDriver: WebDriver): WebDriver

  // public driver1(newDriver?: WebDriver | null): WebDriver | void {
  //   if (newDriver !== undefined) {
  //     log.verbose('PuppetWebBrowser', 'driver(%s)'
  //                                   , newDriver
  //                                     ? newDriver.constructor.name
  //                                     : null
  //     )
  //   }

  //   if (newDriver !== undefined) {
  //     if (newDriver) {
  //       this.driver = newDriver
  //       return this.driver
  //     } else { // null
  //       if (this.driver && this.driver.getSession()) {
  //         throw new Error('driver still has session, can not set null')
  //       }
  //       this.driver = null
  //       return
  //     }
  //   }

  //   if (!this.driver) {
  //     const e = new Error('no driver')
  //     log.warn('PuppetWebBrowser', 'driver() exception: %s', e.message)
  //     throw e
  //   }
  //   // if (!this.driver.getSession()) {
  //   //   const e = new Error('no driver session')
  //   //   log.warn('PuppetWebBrowser', 'driver() exception: %s', e.message)
  //   //   this.driver.quit()
  //   //   throw e
  //   // }

  //   return this.driver
  // }

  public close()              { return this.driver.close() }
  public executeScript()      { return this.driver.executeScript.apply(this.driver, arguments) }
  public executeAsyncScript() { return this.driver.executeAsyncScript.apply(this.driver, arguments) }
  public get(url: string)     { return this.driver.get(url) }
  public getSession()         { return this.driver.getSession() }
  public manage()             { return this.driver.manage() }
  public navigate()           { return this.driver.navigate() }
  public quit()               { return this.driver.quit() }
}

export default BrowserDriver
