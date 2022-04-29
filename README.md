# knollan-visualizer
An HTML5 &lt;canvas&gt; adaptation of [Michael Huebler's (mh's) visualizer](https://github.com/mh-/AxisVisualizer) for Knollan lock internals. Live version hosted at https://prevarikation.github.io/knollan-visualizer/.

<img src="https://prevarikation.github.io/knollan-visualizer/img/master-lock-promotional-photo.png" alt="Photo of Master Lock Speed Dial">

## Background
[Yehonatan Knoll](https://www.youtube.com/user/yonatan2806/featured) is the inventor of a [novel combination lock](https://patents.google.com/patent/US20030205069A1/) which uses four rotatable disks that are spun by a control piece moving in up, down, left and right directions. The lock remains closed until a true gate on each disk is aligned with a windmill-style fence, at which point the shackle can be opened.

Manufactured locks are available directly as [Knollan](http://knollan.net/)s, or more commonly, produced under the Master Lock brand name – [Master Lock Speed Dial/1500i/ONE](https://www.masterlock.com/products/product/1500iD).

In 2008, [Michael Huebler](http://www.huebler.org/mh/) (mh) extensively researched this locking mechanism [(papers available through TOOOL)](https://toool.nl/Publications) and created a visualizer for the internals, written in Flash ActionScript. mh has released the visualizer's [source code,](https://github.com/mh-/AxisVisualizer) in part because Flash is now unsupported. **This repository is an HTML5 &lt;canvas> adaptation of mh's visualizer, with additional features for lock research.**

## Ongoing Research
No reliable decoding method was widely known, until recently! [Blank Registration](https://github.com/david-miller/speeddial_research) has developed a keyspace reduction technique for the Master Lock Speed Dial ([video](https://www.lockpicking101.com/viewtopic.php?f=9&t=45268&start=45#p495036) and [writeup](https://drive.google.com/file/d/1u3AgRIjficr5jQgkzEi9W6LfUoCii-G_/view)) which reduces brute-force search from 7501 total combinations to at most 75. This repository also contains a tool to more easily implement the technique. Live version at [Blank Registration's Locker Unlocker](https://prevarikation.github.io/knollan-visualizer/blank-registration-locker-unlocker.html).

The Knollan, which contains two false gates on each disk, remains elusive :) Please join in the quest!
