
// 是一个对象,其中每个属性是一个处理函数 根据属性名调用函数 compileUtil['attrname'] 策略模式
const compileUtil = {
  // 相当于:getVal: function() {}
  getVal(expr,vm) {
    // reduce(reducer函数,初始值)
    // reducer(累积值,当前值)
    return expr.split('.').reduce((data,currentStr)=>{ //  expr:'person.name'=>['person','name'] $data:{ person:{ name:zss}}=>$data['person']['name']
      // 最初data=$data(初始值)
      return data[currentStr];
    },vm.$data)
  },
  setVal(expr,vm,value) { 
    
    const arr = expr.split('.');
    let resData = vm.$data;
    for(let i = 0;i<arr.length-1;i++) {
      resData = resData[arr[i]]
    }
    resData[arr[arr.length-1]] = value;
  },
  //获取新值 对{{a}}--{{b}} 这种格式进行处理
  getContentVal(expr, vm) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        return this.getVal(args[1], vm);
    })
  },

  text(node,expr,vm) {
    let value;
    if (expr.indexOf('{{') !== -1) {
      value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        // 绑定watcher
        //绑定watcher从而更新视图
        new Watcher(vm,args[1],()=>{           
          this.updater.textUpdater(node,this.getContentVal(expr, vm));
        })
        // new Watcher(vm,args[1],(newVal)=> {
        //   this.updater.textUpdater(node,newVal)
        // })
        return this.getVal(args[1], vm);
      })
    }else{ //也可能是v-text='obj.name' v-text='msg'
      // 绑定watcher
      new Watcher(vm,expr,(newVal)=> {
        this.updater.textUpdater(node,newVal)
      })
      value = this.getVal(expr,vm);
    }
    // console.log(value)
      this.updater.textUpdater(node,value)
  },
  html(node,expr,vm) {
    const value = this.getVal(expr,vm)
    new Watcher(vm,expr,(newVal)=> {
      this.updater.htmlUpdater(node,newVal)
    })
    console.log(expr,'绑定了Watch');
    this.updater.htmlUpdater(node,value)
  },
  model(node,expr,vm) {
    const value = this.getVal(expr,vm)
    // 数据驱动视图
    new Watcher(vm,expr,(newVal)=>{
      this.updater.modelUpdater(node,newVal)
    })
    // 视图驱动数据
    node.addEventListener('input',(e)=>{
      this.setVal(expr,vm,e.target.value)
    })
    this.updater.modelUpdater(node,value)
  },
  on(node,methodName,vm,eventName) {
    // 绑定事件
    let fn = vm.$options.methods && vm.$options.methods[methodName]
    node.addEventListener(eventName,fn.bind(vm))
  },
  bind(node,expr,vm,attrName) {

    // console.log(attrName,expr)
     let value = this.getVal(expr,vm)
    node.setAttribute(attrName,value)
  },
  updater: {
    textUpdater(node,value) {
      node.textContent = value;
    },
    htmlUpdater(node,value) {
      // console.log(value)
      node.innerHTML = value;
    },
    modelUpdater(node,value) {
      node.value = value;
    },
  }

}

class Compile{
  // 构造参数: dom节点,vue实例
  constructor(el,vm) {
    this.el = this.isElementNode(el)? el : document.querySelector(el);
    this.vm = vm;
    // 将el的子节点存放入文档碎片对象,防止直接使用document的页面重新渲染
    const fragment = this.nodeToFragment(this.el);

    // 文档重新编译(把{{msg}}等替换成数据)
    this.compile(fragment);

    // 处理后的子元素追加到el根元素上
    this.el.appendChild(fragment);
  }
  compile(fragment) {
    const childNodes = fragment.childNodes;
    childNodes.forEach(node=>{
      if(this.isElementNode(node)) {
        //元素节点编译
        this.compileElement(node)
        // 递归编译子节点
        if(node.childNodes && node.childNodes.length) {
          this.compile(node)
        }
      } else {
        //文本节点编译
        this.compileText(node)
      }
    })
  }

  // 解析元素节点中的属性,获取指令,分别解析
  compileElement(node) {
    const attributes = node.attributes;
    [...attributes].forEach(attr=>{
      const {name,value} = attr;
      // 选择vue指令进行处理,v-text v-html v-model v-on:click v-bind:src="imgSrc"
      if(this.isDirctive(name)) { 
        const [,dirctive] = name.split('-'); // 获取text,html,model,on:click
        const [dirName,eventName] = dirctive.split(':'); // [on,click] [bind,src]
        // 最终解析和渲染
        compileUtil[dirName](node,value,this.vm,eventName);
        // 删除标签上的指令属性
        node.removeAttribute(name)
      } else if(this.isEventName(name)) {
        // 处理@:click = 'open'
        const [,eventName] = name.split('@');
        compileUtil['on'](node,value,this.vm,eventName);
      }
    })
  }
  
  compileText(node) {
    // 处理{{}}
    const content = node.textContent; // 获取实际文本内容
    // 匹配{{xxx}}的内容
    if (/\{\{(.+?)\}\}/.test(content)) {
      // 处理文本节点
      compileUtil['text'](node, content, this.vm)
    }
  }

  // 处理@click
  isEventName(attrName) {
    return attrName.startsWith('@')
  }


  // 是否是vue指令
  isDirctive(attrName) {
    return attrName.startsWith('v-')
  }

  nodeToFragment(el) {
    const f = document.createDocumentFragment();
    // 把el的子节点全部取出,转换成fragment对象
    // console.log(el);

    let firstChild;
    while(firstChild = el.firstChild) {
      // console.log(firstChild);
      f.appendChild(firstChild);
    }
    return f;
  }
  // 判断传入的是节点对象还是选择器字符串
  isElementNode(el) {
    // console.log(el.nodeType=== 1);
    return el.nodeType === 1
  }
}


/********************************************************************************************** */
class ZssVue {
  constructor(options) {
    this.$el = options.el;
    this.$data = options.data;
    this.$options = options;

    if(this.$el) {
      // 1. 实现对数据的劫持
      new Observer(this.$data)
      // 2. 实现一个指令解析器
      new Compile(this.$el,this)
      // 页面上修改data时候需要写 this.$data.msg 
      // 想要改成this.msg 就可以调用
      // 把data里面的属性,挂到this(vue实例)上
      this.proxyData(this.$data)
    }
    
  }

  // 把某个对象的属性 变成vue实例上的属性
  proxyData(data) {
    for(const key in data) {
      Object.defineProperty(this,key,{
        get(){
          return data[key]
        },
        set(newVal) {
          data[key] = newVal;
          return true
        }
      })
    }
    
  }
}