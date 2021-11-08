class Dep {
  // 收集依赖,通知watcher
  constructor() {
    this.subs = []
  }
  notify() {
    this.subs.forEach(watcher=>{watcher.update()})

  }
  addSub(watcher) {
    this.subs.push(watcher)
  }
}
class Watcher {
  // vm,expr 获取值 cb 数据更新后的操作 
  constructor(vm,expr,cb) {
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;

    // 我认为Dep.target就是一个全局Flag,用来标志此时是否有一个watcher
    Dep.target = this;
    //在此处会触发expr所代表的值得getter方法,在那里添加依赖!这时候正好Dep.target有值
    this.oldVal = this.getOldVal()
    Dep.target = null;

    console.log('创建watcher');
  }
  // 获取旧值
  getOldVal() {
    
    
    const oldVal = compileUtil.getVal(this.expr,this.vm);
    
    return oldVal;
  }
  // 更新视图
  update() {
    const newVal = compileUtil.getVal(this.expr,this.vm);
    if(newVal !== this.oldVal) {
      // 更新后需要做的操作(由Watcher绑定者定义),此处调用,传参
      this.cb(newVal)
    }
    
  }
}

class Observer{
  constructor(data) {
    this.observe(data);
  }
  observe(data) {
    
    // 处理嵌套的对象
    if(data && typeof data === 'object') {
      console.log('给对象添加observer');
      Object.keys(data).forEach(key=> {
        
        this.defineReactive(data,key,data[key]);
      })
    }
  }
  defineReactive(obj,key,value) {
    // 对值进行递归遍历
    this.observe(value);
    const dep = new Dep();
    console.log('给属性'+key+'添加数据劫持');
    Object.defineProperty(obj,key,{
      enumerable: true,
      configurable: false, // 是否可被删除,
      
      get() {
        // 订阅的数据法伤变化时,往Dep中添加观察者(收集依赖)
        console.log('正在get-----'+key);
        if(Dep.target) {
          console.log('添加依赖',Dep.target,'属性',key);
          dep.addSub(Dep.target);
        }
        return value;
      },
      set:(newValue) => {
        this.observe(newValue);
        console.log('正在set-----'+key);
        if(newValue !== value) {
          value = newValue;
        }
        // 通知变化
        dep.notify();
      } 
    })
  }
}